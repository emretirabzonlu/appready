export const TERMS: Record<string, string> = {
  ISM: 'Uluslararası Emniyetli Yönetim Kodu',
  MLC: 'Denizcilik Çalışma Sözleşmesi 2006',
  VDR: 'Seyir Veri Kaydedici',
  CIC: 'Yoğunlaştırılmış Denetim Kampanyası',
  MoU: 'Mutabakat Muhtırası',
  DoC: 'Uygunluk Belgesi',
  SMC: 'Emniyetli Yönetim Belgesi',
  ISSC: 'Uluslararası Gemi Güvenlik Sertifikası',
  IOPP: 'Petrol Kirliliği Önleme',
  IAPP: 'Hava Kirliliği Önleme',
  ISPP: 'Pis Su Kirliliği Önleme',
  BWM: 'Balast Suyu Yönetimi',
  IEEC: 'Enerji Verimliliği',
  'Load Lines': 'Yükleme Sınırı / Fribord',
}

export function findTermDefinitions(text: string): string[] {
  return Object.entries(TERMS)
    .filter(([abbr]) => {
      if (abbr.includes(' ')) return text.toLowerCase().includes(abbr.toLowerCase())
      return new RegExp(`\\b${abbr}\\b`, 'i').test(text)
    })
    .map(([, def]) => def)
}
