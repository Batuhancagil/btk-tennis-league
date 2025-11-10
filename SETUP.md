# BTK Tenis Ligi Yönetim Sistemi - Kurulum Kılavuzu

## Gereksinimler

- Node.js 18+ 
- PostgreSQL veritabanı
- Google OAuth credentials (opsiyonel)
- GitHub OAuth credentials (opsiyonel)

## Google OAuth Credentials Nasıl Alınır?

### Adım 1: Google Cloud Console'a Giriş
1. [Google Cloud Console](https://console.cloud.google.com/) adresine gidin
2. Google hesabınızla giriş yapın

### Adım 2: Proje Oluşturma
1. Üst kısımdaki proje seçici menüden "New Project" tıklayın
2. Proje adını girin (örn: "BTK Tennis League")
3. "Create" butonuna tıklayın
4. Proje oluşturulduktan sonra projeyi seçin

### Adım 3: OAuth Consent Screen Yapılandırma
1. Sol menüden **"APIs & Services"** > **"OAuth consent screen"** seçin
2. **User Type** seçin:
   - **External**: Herkesin kullanabileceği (genellikle bu seçilir)
   - **Internal**: Sadece Google Workspace organizasyonunuzdaki kullanıcılar için
3. **App information** doldurun:
   - **App name**: "BTK Tennis League" (veya istediğiniz isim)
   - **User support email**: E-posta adresiniz
   - **Developer contact information**: E-posta adresiniz
4. **"Save and Continue"** tıklayın
5. **Scopes** sayfasında varsayılan ayarları bırakıp **"Save and Continue"** tıklayın
6. **Test users** sayfasında (External seçtiyseniz) test kullanıcıları ekleyebilirsiniz, şimdilik atlayabilirsiniz
7. **"Back to Dashboard"** tıklayın

### Adım 4: OAuth 2.0 Client ID Oluşturma
1. Sol menüden **"APIs & Services"** > **"Credentials"** seçin
2. Üst kısımdan **"+ CREATE CREDENTIALS"** > **"OAuth client ID"** seçin
3. **Application type**: **"Web application"** seçin
4. **Name**: "BTK Tennis League Web Client" (veya istediğiniz isim)
5. **Authorized JavaScript origins** bölümüne ekleyin:
   ```
   https://btk-tennis-league-production.up.railway.app
   ```
   (Local development için de ekleyebilirsiniz: `http://localhost:3000`)
6. **Authorized redirect URIs** bölümüne ekleyin:
   ```
   https://btk-tennis-league-production.up.railway.app/api/auth/callback/google
   ```
   (Local development için de ekleyebilirsiniz: `http://localhost:3000/api/auth/callback/google`)
7. **"CREATE"** butonuna tıklayın
8. Bir popup açılacak ve **Client ID** ve **Client Secret** gösterilecek
9. Bu bilgileri kopyalayın ve güvenli bir yere kaydedin (bir daha gösterilmeyecek!)

### Adım 5: Railway'a Environment Variables Ekleme
1. Railway dashboard'unuza gidin
2. Projenizi seçin
3. **"Variables"** sekmesine gidin
4. Şu değişkenleri ekleyin:
   - `GOOGLE_CLIENT_ID`: Kopyaladığınız Client ID
   - `GOOGLE_CLIENT_SECRET`: Kopyaladığınız Client Secret

### Önemli Notlar:
- **Client Secret** sadece bir kez gösterilir, kaybetmemeniz önemli!
- Production için OAuth consent screen'i Google'a göndermeniz gerekebilir (verification süreci)
- Test modunda sadece eklediğiniz test kullanıcıları giriş yapabilir
- Production'a geçmeden önce OAuth consent screen'i publish etmeniz gerekir

## Kurulum Adımları

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. Environment Variables

`.env` dosyası oluşturun ve aşağıdaki değişkenleri ekleyin:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/btk_tennis?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here" # openssl rand -base64 32 ile oluşturabilirsiniz

# OAuth Providers (Google)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OAuth Providers (GitHub)
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"
```

### 3. Database Setup

```bash
# Prisma client'ı generate edin
npx prisma generate

# Database'i oluşturun ve migrate edin
npx prisma db push

# (Opsiyonel) Prisma Studio ile database'i görüntüleyin
npx prisma studio
```

### 4. İlk Superadmin Kullanıcısı Oluşturma

Database'e manuel olarak ilk superadmin kullanıcısını eklemeniz gerekiyor. Prisma Studio veya SQL ile:

```sql
-- Örnek: Email ile kullanıcı bulup superadmin yapma
UPDATE "users" 
SET "role" = 'SUPERADMIN', "status" = 'APPROVED' 
WHERE "email" = 'admin@example.com';
```

### 5. Development Server'ı Başlatın

```bash
npm run dev
```

Uygulama http://localhost:3000 adresinde çalışacaktır.

## Railway Deployment

1. Railway hesabınıza giriş yapın
2. Yeni bir proje oluşturun
3. GitHub repository'nizi bağlayın
4. PostgreSQL servisi ekleyin
5. Environment variables'ları ekleyin:
   - DATABASE_URL (Railway otomatik sağlar)
   - NEXTAUTH_URL (Railway URL'iniz)
   - NEXTAUTH_SECRET
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - GITHUB_ID
   - GITHUB_SECRET
6. Deploy edin

## Kullanım

### Roller ve Yetkiler

1. **Oyuncu (Player)**
   - Profil görüntüleme
   - Takım davetlerini kabul/reddetme
   - Maç geçmişi ve istatistikleri görüntüleme

2. **Takım Kaptanı (Captain)**
   - Takım oluşturma
   - Oyuncu davet etme
   - Maç kadrosu belirleme
   - Maç sonuçlarını girme
   - Oyuncu seviyelerini güncelleme

3. **Lig Yöneticisi (Manager)**
   - Lig oluşturma
   - Takımları lige ekleme/çıkarma
   - Fikstür oluşturma
   - Maç sonuçlarını onaylama
   - Lig tablosunu görüntüleme

4. **Superadmin**
   - Tüm oyuncuları onaylama/reddetme
   - Rol atama
   - Tüm verilere erişim

## Özellikler

- ✅ OAuth ile giriş (Google/GitHub)
- ✅ Role-based access control
- ✅ Takım yönetimi (erkek/kadın/mix kategorileri)
- ✅ Maç yönetimi (single/double)
- ✅ Fikstür oluşturma (round-robin algoritması)
- ✅ Maç sonuç takibi
- ✅ Lig tablosu ve puan durumu
- ✅ Oyuncu istatistikleri
- ✅ Mobil uyumlu responsive tasarım

## API Endpoints

- `/api/auth/*` - Authentication
- `/api/users/*` - User management
- `/api/teams/*` - Team management
- `/api/leagues/*` - League management
- `/api/matches/*` - Match management
- `/api/invitations/*` - Invitation management

## Notlar

- İlk giriş yapan kullanıcılar otomatik olarak "PENDING" durumunda oluşturulur
- Superadmin tarafından onaylanmaları gerekir
- Cinsiyet bilgisi takım davetlerinde kontrol edilir
- Maç kadroları single/double tipine göre doğrulanır

