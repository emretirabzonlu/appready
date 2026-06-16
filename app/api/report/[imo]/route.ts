import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getShipByImo, getInspectionsByShip, getDeficiencies } from '@/lib/ships'
import type { Ship, Inspection, Deficiency } from '@/lib/ships'
import { getPorts } from '@/lib/ports'
import { getBaselines, getBaselinesFallback } from '@/lib/baselines'
import type { Baseline } from '@/lib/baselines'
import { getCertificates } from '@/lib/certificates'
import type { CertWithStatus } from '@/lib/certificates'
import { getActiveCampaign } from '@/lib/cic'
import type { CicCampaign } from '@/lib/cic'
import { generateExecutiveSummary } from '@/lib/ai-summary'
import { computeRisk, isCriticalCert } from '@/lib/fleet'

export const runtime = 'nodejs'
export const maxDuration = 60

async function launchBrowser() {
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default
    const { default: puppeteerCore } = await import('puppeteer-core')
    return puppeteerCore.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }
  const { default: puppeteer } = await import('puppeteer')
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
}

type InspectionRow = { inspection: Inspection; deficiencies: Deficiency[] }
type RedFlag = {
  displayText: string
  occurrences: number
  dates: string[]
  isDetentionLinked: boolean
  detentionYears: string[]
}
type ChecklistItem = {
  label: string
  priority: 'high' | 'medium' | 'regional'
  tag: 'cic' | 'overlap' | 'baseline' | 'ship'
}

function computeRedFlags(rows: InspectionRow[]): RedFlag[] {
  // canonical ID: physical_group collapses same physical inspection recorded under multiple MoUs into one
  type CanonEntry = { date: string; isDetention: boolean }
  const map = new Map<string, {
    displayText: string
    canonicals: Map<string, CanonEntry>
    isDetainable: boolean
  }>()

  for (const { inspection, deficiencies } of rows) {
    // physical_group links explicit cross-MoU duplicates; fall back to date as proxy
    // (same ship, same date → same physical inspection even without physical_group)
    const canonId = inspection.physical_group ?? inspection.report_date
    const isDetention = inspection.detention ?? false

    for (const d of deficiencies) {
      const raw = d.deficiency_text?.trim() ?? d.category ?? null
      if (!raw) continue
      const key = raw.toLowerCase()
      if (!map.has(key)) {
        map.set(key, { displayText: raw, canonicals: new Map(), isDetainable: false })
      }
      const entry = map.get(key)!
      const prev = entry.canonicals.get(canonId)
      entry.canonicals.set(canonId, {
        date: inspection.report_date,
        isDetention: isDetention || (prev?.isDetention ?? false),
      })
      if (d.is_detainable) entry.isDetainable = true
    }
  }

  return [...map.entries()]
    .filter(([, v]) => v.canonicals.size >= 2)
    .map(([, v]) => {
      const canonList = [...v.canonicals.values()]
      const isDetentionLinked = v.isDetainable || canonList.some((c) => c.isDetention)
      const detentionYears = [...new Set(
        canonList.filter((c) => c.isDetention).map((c) => c.date.slice(0, 4)),
      )].sort()
      return {
        displayText: v.displayText,
        occurrences: v.canonicals.size,
        dates: canonList.map((c) => c.date).sort().reverse(),
        isDetentionLinked,
        detentionYears,
      }
    })
    .sort((a, b) => b.occurrences - a.occurrences)
}

function esc(s: string | null | undefined): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtml(opts: {
  ship: Ship
  rows: InspectionRow[]
  certificates: CertWithStatus[]
  baselines: Baseline[]
  redFlags: RedFlag[]
  sortedChecklistItems: ChecklistItem[]
  sortedShipCats: [string, number][]
  overlapping: Set<string>
  baselineCatSet: Set<string>
  baselineIsFallback: boolean
  selectedMouName: string | null
  activeCampaign: CicCampaign | null
  inspectionCount: number
  detentionCount: number
  longestDetentionDays: number | null
  riskLabel: string
  riskClass: string
  mouRegionId: string | null
  aiSummary: string | null
  regionBaselines: Map<string, Baseline[]>
  inspectionRegionNames: Map<string, string>
  physicalGroupConflicts: Array<{ regionNames: string[]; date: string }>
  earliestInspYear: string | null
  logoDataUri: string
}): string {
  const {
    ship, rows, certificates, baselines, redFlags, sortedChecklistItems,
    sortedShipCats, overlapping, baselineIsFallback,
    selectedMouName, activeCampaign,
    inspectionCount, detentionCount, longestDetentionDays,
    riskLabel, riskClass, mouRegionId, aiSummary,
    regionBaselines, inspectionRegionNames, physicalGroupConflicts,
    earliestInspYear, logoDataUri,
  } = opts

  const today = new Date().toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  let step = 0

  // ── Sub-items per category (real deficiencies from this ship's history) ──────
  const catSubItemsRaw = new Map<string, Map<string, { display: string; count: number }>>()
  for (const { deficiencies } of rows) {
    for (const d of deficiencies) {
      if (!d.category) continue
      const raw = d.deficiency_text?.trim() || d.sub_category?.trim() || null
      if (!raw || raw.toLowerCase() === (d.category ?? '').toLowerCase()) continue
      const norm = raw.toLowerCase()
      const sub = catSubItemsRaw.get(d.category) ?? new Map<string, { display: string; count: number }>()
      const entry = sub.get(norm)
      if (entry) { entry.count++ } else {
        sub.set(norm, { display: raw, count: 1 })
      }
      catSubItemsRaw.set(d.category, sub)
    }
  }
  const catSubItems = new Map<string, string[]>(
    [...catSubItemsRaw.entries()].map(([cat, sub]) => [
      cat,
      [...sub.values()].sort((a, b) => b.count - a.count).map((v) => v.display),
    ]),
  )
  function subHtml(cat: string): string {
    const items = catSubItems.get(cat) ?? []
    if (items.length === 0) return ''
    return `<span class="cat-sub">${items.map(esc).join(', ')}</span>`
  }

  // ── AI Executive Summary (optional) ────────────────────────────────────────
  const aiSummarySection = aiSummary ? `
<div class="ai-summary">
  <div class="ai-summary-label">AI Yönetici Özeti</div>
  <p class="ai-summary-text">${esc(aiSummary)}</p>
</div>` : ''

  // ── Section 1: Metrics ──────────────────────────────────────────────────────
  const s1 = ++step
  const detVariant = detentionCount > 0 ? 'danger' : 'success'
  const daysVariant = longestDetentionDays !== null ? 'warning' : 'navy'

  const analysisContextNote = earliestInspYear
    ? `<div class="analysis-context-note">
        Toplam <strong>${inspectionCount} denetim</strong> kaydı bulunmaktadır (en eski: ${earliestInspYear}).
        Eksiklik ve kronik tekrar analizleri yalnızca detay verisi bulunan denetimlere dayanmaktadır —
        PSC risk değerlendirmesi tipik olarak <strong>son 36 aya</strong> odaklandığından bu yaklaşım güncel performansı yansıtır.
      </div>`
    : ''

  const metricsSection = `
<div class="section">
  <div class="section-anchor">
    <div class="section-header">
      <div class="section-num">${s1}</div>
      <div class="section-title-block">
        <div class="section-title">Özet Metrikler</div>
        <div class="section-desc">Tüm kayıtlardaki toplam denetim ve tutulma${earliestInspYear ? ` — ${earliestInspYear}'den bugüne` : ''}</div>
      </div>
    </div>
  </div>
  <div class="metrics-grid">
    <div class="metric-card metric-navy">
      <div class="metric-label">Denetim</div>
      <div class="metric-value">${inspectionCount}</div>
      ${earliestInspYear ? `<div class="metric-sub">${earliestInspYear}'den bu yana</div>` : ''}
    </div>
    <div class="metric-card metric-${detVariant}">
      <div class="metric-label">Tutulma</div>
      <div class="metric-value">${detentionCount}</div>
      ${inspectionCount > 0 ? `<div class="metric-sub">${inspectionCount} denetimde</div>` : ''}
    </div>
    <div class="metric-card metric-${daysVariant}">
      <div class="metric-label">En Uzun Tutulma</div>
      <div class="metric-value">${longestDetentionDays ?? '—'}</div>
      ${longestDetentionDays !== null ? '<div class="metric-sub">gün</div>' : ''}
    </div>
  </div>
  ${analysisContextNote}
</div>`

  // ── Section 2: Gap Analysis ─────────────────────────────────────────────────
  const s2 = ++step
  const overlapAlert = overlapping.size > 0
    ? `<div class="risk-alert"><span class="risk-alert-text">⚠ ${overlapping.size} yüksek riskli kategori tespit edildi — hem bölgenin odaklandığı hem bu geminin zayıf olduğu alanlar.</span></div>`
    : ''

  const baselineRows = baselines.length === 0
    ? '<p class="empty-text">Bu bölge için baseline verisi bulunamadı.</p>'
    : baselines.map((b) => {
        const isOverlap = overlapping.has(b.category)
        return `<div class="analysis-row">
          <span class="analysis-rank">${b.rank ?? ''}</span>
          <span class="pill ${isOverlap ? 'pill-danger' : 'pill-muted'}" style="flex:1">${esc(b.category)}</span>
          ${b.pct != null ? `<span class="analysis-count ${isOverlap ? 'count-danger' : ''}" style="color:#9ca3af">${Number(b.pct).toFixed(1)}%</span>` : ''}
        </div>`
      }).join('')

  const shipCatRows = sortedShipCats.length === 0
    ? '<p class="empty-text">Eksiklik kaydı bulunamadı.</p>'
    : sortedShipCats.slice(0, 10).map(([cat, count]) => {
        const isOverlap = overlapping.has(cat)
        const sub = subHtml(cat)
        return `<div class="shipcat-row">
          <div class="shipcat-body">
            <span class="pill ${isOverlap ? 'pill-danger' : 'pill-warning'}">${esc(cat)}</span>
            ${sub}
          </div>
          <span class="analysis-count ${isOverlap ? 'count-danger' : 'count-warning'} shipcat-count">${count}×</span>
        </div>`
      }).join('')

  const noPortNote = !mouRegionId
    ? '<p class="empty-text">Çakışma analizi için varış limanı seçilmedi.</p>'
    : ''
  const noTypeNote = mouRegionId && !ship.ship_type
    ? '<p class="empty-text">Gemi tipi bilinmediğinden bölge karşılaştırması yapılamıyor.</p>'
    : ''

  const topCats = sortedShipCats.slice(0, 5)
  const topOverlapCount = topCats.filter(([cat]) => overlapping.has(cat)).length
  const overlapSentence = mouRegionId && baselines.length > 0 && topCats.length > 0 && topOverlapCount > 0
    ? (() => {
        const isMajority = topOverlapCount > topCats.length / 2
        const text = isMajority
          ? 'Geminin en sık eksiklik aldığı kategorilerin çoğu, bu bölgenin en yoğun denetlediği alanlarla örtüşüyor.'
          : 'Geminin sık tekrar eden kategorilerinden bir bölümü, bu bölgenin denetim odağıyla örtüşüyor.'
        return `<div class="overlap-sentence${isMajority ? ' overlap-sentence-danger' : ''}">${text}</div>`
      })()
    : ''

  const analysisSection = `
<div class="section">
  <div class="section-anchor">
    <div class="section-header">
      <div class="section-num">${s2}</div>
      <div class="section-title-block">
        <div class="section-title">Çakışma Analizi</div>
        <div class="section-desc">Bölge odak alanları ile gemi denetim geçmişinin karşılaştırması${selectedMouName ? ` — ${esc(selectedMouName)}` : ''}</div>
      </div>
    </div>
    ${noPortNote || noTypeNote ? '' : `${overlapAlert}${overlapSentence}`}
  </div>
  ${noPortNote || noTypeNote || `
    <div class="analysis-grid">
      <div class="card">
        <div class="card-title">Bölge Risk Profili ${baselineIsFallback ? '(tüm gemi tipleri)' : ''}</div>
        ${baselineRows}
      </div>
      <div class="card">
        <div class="card-title">Gemi Zayıf Noktaları — tüm denetimler</div>
        ${shipCatRows}
      </div>
    </div>
  `}
</div>`

  // ── Section 3: PSC'ye Göre Değişir ────────────────────────────────────────
  const shipCatSet = new Set(sortedShipCats.map(([cat]) => cat))
  const regionsWithData = [...inspectionRegionNames.keys()].filter(
    (id) => (regionBaselines.get(id)?.length ?? 0) > 0,
  )
  let pscVariationSection = ''
  if (regionsWithData.length > 0) {
    const s3 = ++step
    const regionCards = regionsWithData.map((regionId) => {
      const name = inspectionRegionNames.get(regionId) ?? regionId
      const cats = (regionBaselines.get(regionId) ?? []).slice(0, 7)
      const isTarget = regionId === mouRegionId
      const catRows = cats.map((b) => {
        const inShipHistory = shipCatSet.has(b.category)
        const sub = inShipHistory ? subHtml(b.category) : ''
        return `<div class="rc-row">
          <span class="rc-num">${b.rank ?? ''}</span>
          <span class="rc-check">☐</span>
          <div class="rc-body">
            <span class="rc-label${inShipHistory ? ' rc-label-danger' : ''}">${esc(b.category)}${inShipHistory ? ' <span class="rc-warn">⚠</span>' : ''}</span>
            ${sub}
          </div>
        </div>`
      }).join('')
      return `<div class="card">
        <div class="card-title">${esc(name)}${isTarget ? ' <span class="target-region-badge">Hedef</span>' : ''}</div>
        ${catRows || '<p class="empty-text">Veri yok</p>'}
      </div>`
    }).join('')

    const conflictNote = physicalGroupConflicts.length > 0
      ? physicalGroupConflicts.map((c) => `
          <div class="conflict-note">
            <span class="conflict-icon">⚡</span>
            <span class="conflict-text">Aynı fiziksel denetim farklı rejimlere kayıtlı:
              <strong>${c.regionNames.map(esc).join(' / ')}</strong>
              <span class="date-pill" style="margin-left:4px">${esc(c.date)}</span>
            </span>
          </div>`).join('')
      : ''

    pscVariationSection = `
<div class="section">
  <div class="section-anchor">
    <div class="section-header">
      <div class="section-num">${s3}</div>
      <div class="section-title-block">
        <div class="section-title">PSC'ye Göre Değişir</div>
        <div class="section-desc">Geminin geçtiği MoU bölgelerinin denetim odakları — gemi geçmişiyle örtüşen kategoriler ⚠ ile işaretli</div>
      </div>
    </div>
  </div>
  <div class="region-variation-grid">${regionCards}</div>
  ${conflictNote}
</div>`
  }

  // ── Section N: Chronic Deficiencies ────────────────────────────────────────
  const sRed = ++step
  const redFlagRows = redFlags.length === 0
    ? '<p class="empty-text">Kronik tekrar eden eksiklik bulunamadı.</p>'
    : `<div class="redflag-col-header">
        <span style="flex:1">Eksiklik</span>
        <span class="redflag-det-header">Tutulma sebebi?</span>
      </div>` + redFlags.map((f) => {
        const detBadge = f.isDetentionLinked
          ? `<span class="det-badge det-yes">Evet${f.detentionYears.length > 0 ? ` · ${f.detentionYears[0]}` : ''}</span>`
          : '<span class="det-badge det-no">Hayır</span>'
        return `
        <div class="redflag-item">
          <div class="redflag-body">
            <div class="redflag-text">${esc(f.displayText)}</div>
            <div class="redflag-meta">
              <span class="redflag-count">${f.occurrences} ayrı denetimde</span>
              ${f.dates.slice(0, 4).map((d) => `<span class="date-pill">${esc(d)}</span>`).join('')}
            </div>
          </div>
          <div class="redflag-det">${detBadge}</div>
        </div>`
      }).join('')

  const redFlagSection = `
<div class="section">
  <div class="section-anchor">
    <div class="section-header">
      <div class="section-num">${sRed}</div>
      <div class="section-title-block">
        <div class="section-title">Kronik Eksiklikler</div>
        <div class="section-desc">Birden fazla denetimde tekrar eden eksiklikler</div>
      </div>
    </div>
  </div>
  ${redFlagRows}
</div>`

  // ── Section 4: Certificates ─────────────────────────────────────────────────
  const s4 = ++step
  const certRows = certificates.length === 0
    ? '<p class="empty-text">Sertifika kaydı bulunamadı.</p>'
    : `<table>
        <thead>
          <tr>
            <th>Sertifika</th>
            <th>Veren</th>
            <th>Bitiş Tarihi</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          ${certificates.map((c) => {
            const statusLabel = c.status === 'expired' ? 'Süresi Geçmiş' : c.status === 'expiring' ? 'Yaklaşıyor' : 'Geçerli'
            return `<tr>
              <td>
                <span class="cert-name">${esc(c.cert_type)}</span>
                ${c.is_interim ? '<span class="interim-badge">GEÇİCİ</span>' : ''}
              </td>
              <td style="color:#6b7280">${esc(c.issuer) || '—'}</td>
              <td style="font-variant-numeric:tabular-nums;color:#6b7280">${esc(c.expiry_date) || '—'}</td>
              <td><span class="status-badge status-${c.status}">${statusLabel}</span></td>
            </tr>`
          }).join('')}
        </tbody>
      </table>`

  const certSection = `
<div class="section">
  <div class="section-anchor">
    <div class="section-header">
      <div class="section-num">${s4}</div>
      <div class="section-title-block">
        <div class="section-title">Sertifika Durumu</div>
        <div class="section-desc">Aktif sertifika durumu ve geçerlilik tarihleri</div>
      </div>
    </div>
  </div>
  ${certRows}
</div>`

  // ── Section 5: Checklist ────────────────────────────────────────────────────
  const s5 = ++step
  const checklistRows = !mouRegionId
    ? '<p class="empty-text">Kontrol listesi için varış limanı seçilmedi.</p>'
    : sortedChecklistItems.length === 0
    ? '<p class="empty-text">Kontrol listesi öğesi bulunamadı.</p>'
    : sortedChecklistItems.map((item) => {
        const subItems = item.tag !== 'cic' ? (catSubItems.get(item.label) ?? []) : []
        const priorityLabel = item.priority === 'high' ? 'Yüksek' : item.priority === 'medium' ? 'Orta' : 'Bölgesel'
        const subItemsHtml = subItems.length > 0
          ? `<div class="checklist-subitems">${subItems.map((si) => `
              <div class="checklist-subitem">
                <span class="checkbox-icon">☐</span>
                <span class="checklist-subitem-text">${esc(si)}</span>
              </div>`).join('')}</div>`
          : ''
        return `
          <div class="checklist-group checklist-${item.priority}">
            <div class="checklist-item">
              <div class="checklist-check checklist-check-${item.priority}"></div>
              ${item.tag === 'cic' ? '<span class="tag-cic">CIC</span>' : ''}
              <span class="checklist-label checklist-label-${item.priority}">${esc(item.label)}</span>
              <span class="priority-badge priority-${item.priority}">${priorityLabel}</span>
            </div>
            ${subItemsHtml}
          </div>`
      }).join('')

  const checklistNote = activeCampaign && mouRegionId
    ? `<div style="margin-bottom:10px;padding:8px 12px;background:#fef3c7;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;font-size:10px;color:#92400e">
        ⚠ Aktif YDK Kampanyası: ${esc(activeCampaign.topic)}
      </div>`
    : ''

  const checklistSection = `
<div class="section">
  <div class="section-anchor">
    <div class="section-header">
      <div class="section-num">${s5}</div>
      <div class="section-title-block">
        <div class="section-title">Varış Öncesi Kontrol Listesi</div>
        <div class="section-desc">Liman bölgesi, gemi geçmişi ve aktif kampanyaya göre önceliklendirilmiş kontroller</div>
      </div>
    </div>
  </div>
  ${checklistNote}
  ${checklistRows}
</div>`

  // ── Inspection history summary ──────────────────────────────────────────────
  const inspectionRows = rows.slice(0, 10).map(({ inspection, deficiencies }) => `
    <tr>
      <td style="font-variant-numeric:tabular-nums">${esc(inspection.report_date)}</td>
      <td>${esc(inspection.authority) || '—'}</td>
      <td>${esc(inspection.mou_regions?.name) || '—'}</td>
      <td>${inspection.num_deficiencies ?? deficiencies.length}</td>
      <td>${inspection.detention ? '<span class="status-badge status-expired">Tutulma</span>' : '—'}</td>
    </tr>`).join('')

  const inspHistoryNote = rows.length > 10
    ? `<div class="insp-history-note">Toplam <strong>${rows.length} denetim</strong>${earliestInspYear ? ` · en eskisi ${earliestInspYear}` : ''} · Son ${Math.min(10, rows.length)} denetim gösteriliyor (en yeni üstte)</div>`
    : ''

  const inspectionSection = rows.length > 0 ? `
<div class="section">
  <div class="section-anchor">
    <div class="section-header">
      <div class="section-title-block">
        <div class="section-title" style="font-size:12px;color:#6b7280">Denetim Geçmişi</div>
      </div>
    </div>
  </div>
  ${inspHistoryNote}
  <table>
    <thead>
      <tr>
        <th>Tarih</th><th>Otorite</th><th>Bölge</th><th>Eksiklik</th><th>Tutulma</th>
      </tr>
    </thead>
    <tbody>${inspectionRows}</tbody>
  </table>
</div>` : ''

  // ── Ship meta row ───────────────────────────────────────────────────────────
  const metaItems = [
    ship.ship_type, ship.flag, ship.class_society,
    ship.year_built ? `${ship.year_built} inşa` : null,
    ship.gross_tonnage ? `GT ${ship.gross_tonnage.toLocaleString('tr-TR')}` : null,
    selectedMouName ? `📍 ${selectedMouName}` : null,
  ].filter(Boolean)

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>PSC Hazırlık Raporu — ${esc(ship.name)}</title>
<style>
@page{size:A4;margin:20mm 0 14mm 0}
@page :first{margin-top:0;margin-bottom:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;font-size:11px;color:#1a2540;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;orphans:3;widows:3}

.hero{background:linear-gradient(135deg,#0f2747 0%,#1a3a6e 60%,#0f4c8a 100%);color:#fff;padding:32px 40px 28px;break-inside:avoid;page-break-inside:avoid}
.hero-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
.logo-img{display:block;height:50px;width:auto}
.report-label{font-size:10px;color:rgba(255,255,255,.55);letter-spacing:.08em;text-transform:uppercase;margin-top:3px}
.risk-badge{padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700}
.risk-danger{background:rgba(239,68,68,.18);border:1px solid rgba(239,68,68,.35);color:#fca5a5}
.risk-warning{background:rgba(245,158,11,.18);border:1px solid rgba(245,158,11,.35);color:#fcd34d}
.risk-success{background:rgba(34,197,94,.18);border:1px solid rgba(34,197,94,.35);color:#86efac}
.risk-neutral{background:rgba(107,114,128,.18);border:1px solid rgba(107,114,128,.35);color:#d1d5db}
.ship-name{font-size:26px;font-weight:700;letter-spacing:-.3px;margin-bottom:8px}
.ship-imo{font-size:12px;color:rgba(255,255,255,.5);margin-bottom:6px;font-variant-numeric:tabular-nums}
.ship-meta{display:flex;flex-wrap:wrap;gap:6px 0}
.ship-meta-item{font-size:10.5px;color:rgba(255,255,255,.65);padding-right:10px;margin-right:10px;border-right:1px solid rgba(255,255,255,.15)}
.ship-meta-item:last-child{border-right:none}

.content{padding:22px 40px 20px}

/* ─── Section layout ─────────────────────────────────────────── */
.section{margin-bottom:20px}
/* section-anchor: header + small intro elements, kept together as one unit */
/* Small enough (~40-80px) to always fit at page bottom → no orphan headers */
.section-anchor{break-inside:avoid;page-break-inside:avoid;break-after:avoid;page-break-after:avoid;margin-bottom:10px}
.section-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:0}
.section-num{width:22px;height:22px;border-radius:50%;background:#0f2747;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.section-title-block{border-left:3px solid #0f2747;padding-left:10px}
.section-title{font-size:13px;font-weight:700;color:#0f2747}
.section-desc{font-size:9.5px;color:#6b7280;margin-top:2px}

/* ─── Metrics ────────────────────────────────────────────────── */
.metrics-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;break-inside:avoid;page-break-inside:avoid}
.metric-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;break-inside:avoid;page-break-inside:avoid}
.metric-label{font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}
.metric-value{font-size:24px;font-weight:700;line-height:1}
.metric-sub{font-size:9px;color:#9ca3af;margin-top:3px}
.metric-navy .metric-value{color:#0f2747}
.metric-danger .metric-value{color:#dc2626}
.metric-warning .metric-value{color:#d97706}
.metric-success .metric-value{color:#16a34a}

/* ─── Overlap alerts ─────────────────────────────────────────── */
.risk-alert{display:flex;align-items:center;gap:8px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:7px 12px;margin-top:8px}
.risk-alert-text{font-size:10px;color:#dc2626}
.overlap-sentence{font-size:10px;color:#374151;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;margin-top:6px}
.overlap-sentence-danger{background:#fef2f2;border-color:#fecaca;color:#dc2626}
.overlap-sentence strong{font-weight:700}

/* ─── Analysis grids → stacked single column for reliable page flow ── */
.analysis-grid{display:block}
.analysis-grid>.card{margin-bottom:10px}
.analysis-grid>.card:last-child{margin-bottom:0}
.region-variation-grid{display:block}
.region-variation-grid>.card{margin-bottom:8px}
.region-variation-grid>.card:last-child{margin-bottom:0}

.target-region-badge{display:inline-block;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700;background:#dbeafe;color:#1d4ed8;margin-left:4px;text-transform:none;letter-spacing:0}
.conflict-note{display:flex;align-items:flex-start;gap:6px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:6px 10px;margin-top:8px;font-size:9.5px;color:#92400e;break-inside:avoid;page-break-inside:avoid}
.conflict-icon{flex-shrink:0}
.conflict-text strong{font-weight:700}
.shipcat-row{display:flex;align-items:flex-start;gap:6px;margin-bottom:5px;break-inside:avoid;page-break-inside:avoid}
.shipcat-body{flex:1;min-width:0}
.shipcat-count{flex-shrink:0;padding-top:2px}
.cat-sub{display:block;font-size:8px;color:#9ca3af;margin-top:3px;line-height:1.35;word-break:break-word}
.rc-row{display:flex;align-items:flex-start;gap:5px;margin-bottom:5px;break-inside:avoid;page-break-inside:avoid}
.rc-num{font-size:8px;color:#9ca3af;width:13px;flex-shrink:0;padding-top:2px;text-align:right}
.rc-check{font-size:10px;color:#9ca3af;flex-shrink:0;line-height:1.4;margin-top:1px}
.rc-body{flex:1;min-width:0}
.rc-label{display:block;font-size:9px;line-height:1.35;word-break:break-word;padding:2px 6px;border-radius:4px;background:#f1f5f9;color:#6b7280}
.rc-label-danger{background:#fef2f2;color:#dc2626;font-weight:600}
.rc-warn{font-style:normal;font-size:8px}
/* Cards: break-inside:avoid safe now — no more side-by-side grid */
.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;break-inside:avoid;page-break-inside:avoid}
.card-title{font-size:9px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;break-after:avoid;page-break-after:avoid}
.analysis-row{display:flex;align-items:center;gap:6px;margin-bottom:5px;break-inside:avoid;page-break-inside:avoid}
.analysis-rank{font-size:9px;color:#9ca3af;width:14px;text-align:right;flex-shrink:0}
.pill{display:inline-block;padding:2px 8px;border-radius:20px;font-size:9.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pill-danger{background:#fef2f2;color:#dc2626;font-weight:600}
.pill-warning{background:#fffbeb;color:#d97706}
.pill-muted{background:#f1f5f9;color:#6b7280}
.count-danger{color:#dc2626;font-weight:600;font-size:9.5px;flex-shrink:0}
.count-warning{color:#d97706;font-weight:600;font-size:9.5px;flex-shrink:0}

/* ─── Red flags ──────────────────────────────────────────────── */
.redflag-col-header{display:flex;align-items:center;font-size:8.5px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;padding:0 12px 4px;border-bottom:1px solid #f1f5f9}
.redflag-det-header{flex-shrink:0;width:90px;text-align:right}
.redflag-item{display:flex;align-items:flex-start;gap:8px;border-left:3px solid #dc2626;background:rgba(254,242,242,.45);padding:8px 12px;border-radius:0 6px 6px 0;margin-bottom:7px;break-inside:avoid;page-break-inside:avoid}
.redflag-body{flex:1;min-width:0}
.redflag-text{font-size:10.5px;font-weight:600;color:#1a2540;margin-bottom:3px}
.redflag-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.redflag-count{font-size:9.5px;font-weight:600;color:#dc2626}
.redflag-det{flex-shrink:0;width:90px;text-align:right;padding-top:1px}
.det-badge{display:inline-block;padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700;white-space:nowrap}
.det-yes{background:#fef2f2;color:#dc2626}
.det-no{background:#f1f5f9;color:#9ca3af}
.date-pill{font-size:9.5px;color:#6b7280;background:#f1f5f9;padding:1px 5px;border-radius:3px;font-variant-numeric:tabular-nums}

/* ─── Tables ─────────────────────────────────────────────────── */
table{width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;break-inside:auto;page-break-inside:auto}
thead{display:table-header-group}
th{font-size:9px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;text-align:left;padding:7px 10px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
td{font-size:10.5px;padding:7px 10px;border-bottom:1px solid #f1f5f9;color:#374151;vertical-align:middle}
tr{break-inside:avoid;page-break-inside:avoid}
tr:last-child td{border-bottom:none}
.cert-name{font-weight:600;color:#0f2747}
.status-badge{display:inline-block;padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700}
.status-expired{background:#fef2f2;color:#dc2626}
.status-expiring{background:#fffbeb;color:#d97706}
.status-valid{background:#f0fdf4;color:#16a34a}
.interim-badge{display:inline-block;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700;background:#fffbeb;color:#d97706;margin-left:5px}

/* ─── Checklist ──────────────────────────────────────────────── */
.checklist-group{border-radius:7px;overflow:hidden;margin-bottom:6px;break-inside:avoid;page-break-inside:avoid}
.checklist-item{display:flex;align-items:center;gap:8px;padding:7px 10px}
.checklist-subitems{padding:2px 10px 8px 30px}
.checklist-subitem{display:flex;align-items:flex-start;gap:6px;padding:2px 0}
.checkbox-icon{font-size:11px;flex-shrink:0;line-height:1.3;color:#6b7280}
.checklist-subitem-text{font-size:9.5px;line-height:1.4;color:#374151;word-break:break-word}
.checklist-high{background:rgba(254,242,242,.55)}
.checklist-medium{background:rgba(255,251,235,.55)}
.checklist-regional{background:#f8fafc}
.checklist-check{width:12px;height:12px;border:1.5px solid;border-radius:2px;flex-shrink:0}
.checklist-check-high{border-color:#dc2626}
.checklist-check-medium{border-color:#d97706}
.checklist-check-regional{border-color:#93c5fd}
.checklist-label{flex:1;font-size:10.5px}
.checklist-label-high{color:#dc2626;font-weight:600}
.checklist-label-medium{color:#d97706}
.checklist-label-regional{color:#6b7280}
.priority-badge{font-size:8.5px;font-weight:700;padding:2px 5px;border-radius:3px;white-space:nowrap}
.priority-high{background:rgba(220,38,38,.1);color:#dc2626}
.priority-medium{background:rgba(217,119,6,.1);color:#d97706}
.priority-regional{background:rgba(96,165,250,.1);color:#3b82f6}
.tag-cic{display:inline-block;padding:1px 5px;border-radius:3px;font-size:8.5px;font-weight:700;background:#fffbeb;color:#d97706;margin-right:4px;flex-shrink:0}

/* ─── Utility ────────────────────────────────────────────────── */
.empty-text{font-size:10px;color:#9ca3af;font-style:italic;padding:6px 2px}
.analysis-context-note{margin-top:10px;padding:7px 12px;background:#f0f9ff;border:1px solid #bae6fd;border-left:3px solid #0ea5e9;border-radius:0 6px 6px 0;font-size:9px;color:#0c4a6e;line-height:1.5;break-inside:avoid;page-break-inside:avoid}
.analysis-context-note strong{font-weight:700}
.insp-history-note{margin-bottom:8px;font-size:9px;color:#6b7280;padding:5px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px}

.ai-summary{background:linear-gradient(135deg,#eff6ff 0%,#f0f9ff 100%);border:1px solid #bfdbfe;border-left:4px solid #3b82f6;border-radius:8px;padding:14px 16px;margin-bottom:18px;break-inside:avoid;page-break-inside:avoid}
.ai-summary-label{font-size:8.5px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
.ai-summary-text{font-size:10.5px;color:#1e3a5f;line-height:1.55}

.footer{margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;break-inside:avoid;page-break-inside:avoid}
.footer-note{font-size:10px;color:#6b7280;line-height:1.55;margin-bottom:6px}
.footer-date{font-size:9px;color:#9ca3af;white-space:nowrap}
</style>
</head>
<body>

<!-- ─── Hero ─────────────────────────────────────────────────────────────── -->
<div class="hero">
  <div class="hero-top">
    <div>
      <img src="${logoDataUri}" alt="PortReady" class="logo-img">
      <div class="report-label">PSC Hazırlık Raporu</div>
    </div>
    <div class="risk-badge risk-${riskClass}">${esc(riskLabel)}</div>
  </div>
  <div class="ship-name">${esc(ship.name)}</div>
  <div class="ship-imo">IMO ${esc(ship.imo)}</div>
  ${metaItems.length > 0 ? `<div class="ship-meta">${metaItems.map((m) => `<span class="ship-meta-item">${esc(m)}</span>`).join('')}</div>` : ''}
</div>

<!-- ─── Content ───────────────────────────────────────────────────────────── -->
<div class="content">
  ${aiSummarySection}
  ${metricsSection}
  ${analysisSection}
  ${pscVariationSection}
  ${redFlagSection}
  ${certSection}
  ${checklistSection}
  ${inspectionSection}

  <div class="footer">
    <p class="footer-note">Bu rapor, kamuya açık verilere ve geçmiş kayıtlara dayanan bir hazırlık aracıdır. Resmi bir denetim, sörvey veya uygunluk garantisi değildir; denetim sonucunu garanti etmez. Bu rapordaki bilgilere dayanarak alınan kararların sorumluluğu tamamen gemi işletmecisi ve kaptana aittir. PortReady, bu rapora dayanılarak yapılan işlemlerden veya doğabilecek sonuçlardan sorumlu tutulamaz.</p>
    <span class="footer-date">Oluşturulma: ${today}</span>
  </div>
</div>

</body>
</html>`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imo: string }> },
) {
  const { imo } = await params
  const port = request.nextUrl.searchParams.get('port') ?? undefined

  const [ship, ports] = await Promise.all([getShipByImo(imo), getPorts()])
  if (!ship) return new Response('Gemi bulunamadı', { status: 404 })

  const inspections = await getInspectionsByShip(ship.id)
  const [rowsRaw, certificates, activeCampaign] = await Promise.all([
    Promise.all(
      inspections.map(async (inspection) => ({
        inspection,
        deficiencies: await getDeficiencies(inspection.id),
      })),
    ),
    getCertificates(ship.id),
    getActiveCampaign(),
  ])
  const rows: InspectionRow[] = rowsRaw

  const selectedPort = port ? (ports.find((p) => p.id === port) ?? null) : null
  const mouRegionId = selectedPort?.mou_region_id ?? null
  const selectedMouName = selectedPort?.mou_regions?.name ?? null

  let baselines = mouRegionId && ship.ship_type
    ? await getBaselines(mouRegionId, ship.ship_type)
    : []
  let baselineIsFallback = false
  if (mouRegionId && baselines.length === 0) {
    baselines = await getBaselinesFallback(mouRegionId)
    baselineIsFallback = baselines.length > 0
  }

  const catCounts = new Map<string, number>()
  for (const { deficiencies } of rows) {
    for (const d of deficiencies) {
      if (d.category) catCounts.set(d.category, (catCounts.get(d.category) ?? 0) + 1)
    }
  }
  const sortedShipCats = [...catCounts.entries()].sort(([, a], [, b]) => b - a)
  const baselineCatSet = new Set(baselines.map((b) => b.category))
  const overlapping = new Set([...baselineCatSet].filter((c) => catCounts.has(c)))

  const redFlags = computeRedFlags(rows)

  const checklistItems: ChecklistItem[] = []
  if (mouRegionId) {
    if (activeCampaign) {
      checklistItems.push({ label: activeCampaign.topic, priority: 'high', tag: 'cic' })
    }
    for (const cat of overlapping) {
      checklistItems.push({ label: cat, priority: 'high', tag: 'overlap' })
    }
    for (const [cat] of sortedShipCats.filter(([c]) => !baselineCatSet.has(c)).slice(0, 3)) {
      if (!checklistItems.some((i) => i.label === cat)) {
        checklistItems.push({ label: cat, priority: 'medium', tag: 'ship' })
      }
    }
    for (const b of baselines.filter((b) => !overlapping.has(b.category))) {
      checklistItems.push({ label: b.category, priority: 'regional', tag: 'baseline' })
    }
  }
  const priorityOrder: Record<ChecklistItem['priority'], number> = { high: 0, medium: 1, regional: 2 }
  const sortedChecklistItems = [...checklistItems].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  )

  const inspectionCount = rows.length
  const detentionCount = rows.filter((r) => r.inspection.detention).length
  const longestDetentionDays = rows.reduce<number | null>((max, r) => {
    if (!r.inspection.detention || r.inspection.duration_days == null) return max
    return max === null || r.inspection.duration_days > max ? r.inspection.duration_days : max
  }, null)

  const totalDeficiencies = rows.reduce((sum, r) => sum + (r.inspection.num_deficiencies ?? 0), 0)
  const expiredCerts = certificates.filter((c) => c.status === 'expired')
  const shipRisk = inspectionCount === 0 ? null : computeRisk({
    detentionCount,
    yearBuilt: ship.year_built,
    totalDeficiencies,
    expiredCertCount: expiredCerts.length,
    hasCriticalExpiredCert: expiredCerts.some((c) => isCriticalCert(c.cert_type)),
    expiringCertCount: certificates.filter((c) => c.status === 'expiring').length,
    redFlagCount: redFlags.length,
    nonIacsClass: ship.class_society != null && !ship.class_society.includes('(IACS)'),
  })
  const riskLabel = shipRisk === 'high' ? 'Yüksek Risk' : shipRisk === 'medium' ? 'Orta Risk' : shipRisk === 'low' ? 'Düşük Risk' : 'Bilinmiyor'
  const riskClass = shipRisk === 'high' ? 'danger' : shipRisk === 'medium' ? 'warning' : shipRisk === 'low' ? 'success' : 'neutral'

  // ── Section-3 data: per-region baselines from inspection history ───────────
  const inspectionRegionNames = new Map<string, string>()
  for (const r of rows) {
    if (r.inspection.mou_region_id && r.inspection.mou_regions?.name) {
      inspectionRegionNames.set(r.inspection.mou_region_id, r.inspection.mou_regions.name)
    }
  }
  const inspectionRegionIds = [...inspectionRegionNames.keys()]

  // rows are sorted newest-first; oldest is last
  const earliestInspYear = rows.length > 0
    ? rows[rows.length - 1].inspection.report_date.slice(0, 4)
    : null

  const [aiSummary, regionBaselinesEntries] = await Promise.all([
    generateExecutiveSummary({
      shipName: ship.name,
      shipType: ship.ship_type ?? null,
      flag: ship.flag ?? null,
      inspectionCount,
      detentionCount,
      longestDetentionDays,
      riskLabel,
      redFlagCount: redFlags.length,
      topRedFlags: redFlags.slice(0, 3).map((f) => f.displayText),
      overlappingCategories: [...overlapping],
      expiredCertCount: certificates.filter((c) => c.status === 'expired').length,
      expiringCertCount: certificates.filter((c) => c.status === 'expiring').length,
      activeCampaignTopic: activeCampaign?.topic ?? null,
      selectedMouName,
      earliestInspectionYear: earliestInspYear,
    }),
    Promise.all(
      inspectionRegionIds.map(async (regionId): Promise<[string, Baseline[]]> => {
        let cats = ship.ship_type ? await getBaselines(regionId, ship.ship_type) : []
        if (cats.length === 0) cats = await getBaselinesFallback(regionId)
        return [regionId, cats]
      }),
    ),
  ])
  const regionBaselines = new Map<string, Baseline[]>(regionBaselinesEntries)

  // ── Physical-group conflicts: same physical inspection under different MoUs ─
  const physGroupMap = new Map<string, InspectionRow[]>()
  for (const r of rows) {
    if (r.inspection.physical_group) {
      const g = physGroupMap.get(r.inspection.physical_group) ?? []
      g.push(r)
      physGroupMap.set(r.inspection.physical_group, g)
    }
  }
  const physicalGroupConflicts: Array<{ regionNames: string[]; date: string }> = []
  for (const [, group] of physGroupMap) {
    const regionIds = [...new Set(group.map((r) => r.inspection.mou_region_id).filter((id): id is string => id != null))]
    if (regionIds.length > 1) {
      physicalGroupConflicts.push({
        regionNames: regionIds.map((id) => inspectionRegionNames.get(id) ?? id),
        date: group[0].inspection.report_date,
      })
    }
  }

  const svgRaw = fs.readFileSync(path.join(process.cwd(), 'public', 'logos', 'logo-full-white.svg'))
  const logoDataUri = `data:image/svg+xml;base64,${svgRaw.toString('base64')}`

  const html = buildHtml({
    ship, rows, certificates, baselines, redFlags, sortedChecklistItems,
    sortedShipCats, overlapping, baselineCatSet, baselineIsFallback,
    selectedMouName, activeCampaign,
    inspectionCount, detentionCount, longestDetentionDays,
    riskLabel, riskClass, mouRegionId, aiSummary,
    regionBaselines, inspectionRegionNames, physicalGroupConflicts,
    earliestInspYear, logoDataUri,
  })

  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      preferCSSPageSize: true,
    })
    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="portready-${imo}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } finally {
    await browser.close()
  }
}
