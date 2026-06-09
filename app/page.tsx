import { supabase } from '@/lib/db'

export default async function Home() {
  const { data: regions, error } = await supabase
    .from('mou_regions')
    .select('*')

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold text-red-600">Hata</h1>
        <p className="mt-2 text-sm text-red-500">{error.message}</p>
      </main>
    )
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">MOU Regions</h1>
      <ul className="space-y-1">
        {regions?.map((region) => (
          <li key={region.id} className="text-sm text-gray-700">
            {region.name ?? JSON.stringify(region)}
          </li>
        ))}
      </ul>
    </main>
  )
}
