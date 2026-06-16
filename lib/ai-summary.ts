import Anthropic from '@anthropic-ai/sdk'

export interface SummaryInput {
  shipName: string
  shipType: string | null
  flag: string | null
  inspectionCount: number
  detentionCount: number
  longestDetentionDays: number | null
  riskLabel: string
  redFlagCount: number
  topRedFlags: string[]
  overlappingCategories: string[]
  expiredCertCount: number
  expiringCertCount: number
  activeCampaignTopic: string | null
  selectedMouName: string | null
  earliestInspectionYear: string | null
}

export async function generateExecutiveSummary(input: SummaryInput): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const client = new Anthropic({ apiKey })

  const parts = [
    `Risk Seviyesi: ${input.riskLabel}`,
    `Toplam Denetim: ${input.inspectionCount}`,
    `Tutulma Sayısı: ${input.detentionCount}`,
    input.longestDetentionDays != null ? `En Uzun Tutulma: ${input.longestDetentionDays} gün` : null,
    input.topRedFlags.length > 0
      ? `En sık tekrar eden eksiklik kalemleri (adıyla): ${input.topRedFlags.slice(0, 3).join(', ')}`
      : 'Kronik tekrar eden eksiklik: Yok',
    input.overlappingCategories.length > 0
      ? `Bölge odağıyla çakışan kategoriler: ${input.overlappingCategories.slice(0, 3).join(', ')}`
      : null,
    input.expiredCertCount > 0 ? `Süresi Geçmiş Sertifika: ${input.expiredCertCount}` : null,
    input.expiringCertCount > 0 ? `Yakında Sona Erecek Sertifika: ${input.expiringCertCount}` : null,
    input.activeCampaignTopic ? `Aktif YDK Kampanyası: ${input.activeCampaignTopic}` : null,
    input.selectedMouName ? `Hedef Liman Bölgesi: ${input.selectedMouName}` : null,
    input.shipType ? `Gemi Tipi: ${input.shipType}` : null,
    input.flag ? `Bayrak: ${input.flag}` : null,
    input.earliestInspectionYear
      ? `Denetim Geçmişi: İlk kayıt ${input.earliestInspectionYear} yılına ait (toplam ${input.inspectionCount} denetim tüm dönem için sayılmıştır). Eksiklik analizi yalnızca detay kaydı bulunan denetimlere dayanmaktadır; PSC risk değerlendirmesi tipik olarak son 36 aya odaklanır.`
      : null,
  ].filter(Boolean as unknown as <T>(x: T | null) => x is T)

  const prompt = `Aşağıdaki PSC (Liman Devleti Kontrolü) denetim verilerine dayanarak, 2-3 cümlelik kısa bir yönetici özeti yaz.

Kurallar:
- Türkçe yaz; gemi adını kullanma ("bu gemi" diyebilirsin).
- Kronik eksiklik SAYISI verme (ör. "10 kronik eksiklik" deme). Bunun yerine en kritik 2-3 tekrar eden kalemi ADIYLA belirt (ör. "acil jeneratör, yangın söndürme, kurtarma botu").
- Sen bir hazırlık/uyarı aracısın, otorite değilsin. "Gemi seyretmemeli", "yasaklanmalı", "operasyon durdurulmalı" gibi HÜKÜM verme. Bunun yerine "şu riskler var, şunlara dikkat edilmeli, şu sertifikalar yenilenmeli" gibi UYARI ve ÖNERİ dilinde yaz.
- Abartma ve panik dili kullanma. Profesyonel, sakin, bilgilendirici ol. Veriye dayan ama dramatize etme.
- Sertifika verisi geçmiş bir denetim tarihine ait olabilir; "süresi geçmiş" derken kesin hüküm yerine "kayıtlara göre süresi geçmiş görünüyor, güncel durum doğrulanmalı" gibi temkinli ol.
- Risk seviyesiyle çelişme — eğer süresi geçmiş kritik sertifika varsa gemiyi düşük riskli olarak tanımlama.
- Gemi uzun bir denetim geçmişine sahipse (örn. 2005'ten beri kayıt varsa) bunu kısaca belirt ve PSC'nin son 36 aya odaklandığını, dolayısıyla analizin güncel performansı yansıttığını vurgula.
- Sadece özet metnini yaz — başlık, madde işareti veya ek açıklama ekleme.

Veriler:
${parts.join('\n')}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })
    const block = message.content[0]
    return block.type === 'text' ? block.text.trim() : null
  } catch {
    return null
  }
}
