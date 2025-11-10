# BTK Tenis Ligi Yönetim Sistemi

BTK tenis kulübü için lig yönetim sistemi.

## Teknoloji Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma + PostgreSQL
- NextAuth.js (OAuth)
- Tailwind CSS + shadcn/ui

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Environment variables oluşturun:
```bash
cp .env.example .env
```

3. Database'i hazırlayın:
```bash
npx prisma generate
npx prisma db push
```

4. Development server'ı başlatın:
```bash
npm run dev
```

## Deployment

Railway üzerinde deploy edilir. GitHub'a push edildiğinde otomatik deploy olur.

