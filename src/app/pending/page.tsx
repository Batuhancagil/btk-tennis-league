export default function PendingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Hesabınız Onay Bekliyor
        </h1>
        <p className="text-center text-gray-600">
          Hesabınız superadmin tarafından onaylandıktan sonra sistemi kullanabileceksiniz.
        </p>
      </div>
    </main>
  )
}

