# Tenis Maç Yönetim Sistemi - Test Planı

## Test Senaryoları

### 1. Veritabanı ve Schema Testleri

#### 1.1 ScoreStatus Enum Kontrolü
- [x] ✅ **KOD ANALİZİ**: Prisma schema'da `ScoreStatus` enum tanımlı ve 6 değer içeriyor (PENDING, REPORTED_BY_HOME, REPORTED_BY_AWAY, REPORTED_BY_BOTH, APPROVED, MANAGER_ENTERED)
- [x] ✅ **RUNTIME TEST**: Prisma Client üzerinden `ScoreStatus` enum'ı kontrol edildi - 6 değer mevcut ve doğru
- [x] ✅ **RUNTIME TEST**: Enum değerleri doğru: PENDING, REPORTED_BY_HOME, REPORTED_BY_AWAY, REPORTED_BY_BOTH, APPROVED, MANAGER_ENTERED

#### 1.2 MatchScoreReport Tablosu
- [x] ✅ **KOD ANALİZİ**: Prisma schema'da `MatchScoreReport` modeli doğru tanımlanmış, tüm alanlar mevcut, unique constraint (matchId + reportedById) tanımlı
- [x] ✅ **SCHEMA KONTROLÜ**: Prisma schema'da `match_score_reports` tablosu tanımlı (model MatchScoreReport, @@map("match_score_reports"))
- [x] ✅ **SCHEMA KONTROLÜ**: Tüm kolonlar schema'da doğru tanımlı: id, matchId, reportedById, setsWon, setsLost, gamesWon, gamesLost, setScores (Json), createdAt
- [x] ✅ **SCHEMA KONTROLÜ**: Unique constraint tanımlı: @@unique([matchId, reportedById])
- [ ] ⚠️ **RUNTIME TEST**: Veritabanı bağlantısı gerekiyor - `match_score_reports` tablosunun gerçek veritabanında oluşturulduğunu kontrol et
- [ ] ⚠️ **RUNTIME TEST**: Veritabanı bağlantısı gerekiyor - Unique constraint'in çalıştığını gerçek veri ile test et

#### 1.3 Match Tablosu Güncellemeleri
- [x] ✅ **KOD ANALİZİ**: Prisma schema'da Match modeline tüm yeni alanlar eklenmiş: scoreStatus (ScoreStatus, default: PENDING), setsWonHome, setsWonAway, gamesWonHome, gamesWonAway, finalScoreReportId
- [x] ✅ **SCHEMA KONTROLÜ**: `matches` tablosuna yeni kolonlar schema'da doğru tanımlı:
  - [x] scoreStatus (ScoreStatus, default: PENDING)
  - [x] setsWonHome (Int?, nullable)
  - [x] setsWonAway (Int?, nullable)
  - [x] gamesWonHome (Int?, nullable)
  - [x] gamesWonAway (Int?, nullable)
  - [x] finalScoreReportId (String?, nullable)
- [ ] ⚠️ **RUNTIME TEST**: Veritabanı bağlantısı gerekiyor - `matches` tablosuna yeni kolonların gerçek veritabanında eklendiğini kontrol et

---

### 2. Oyuncu Skor Bildirimi Testleri

#### 2.1 Maç Durumu Kontrolü
- [ ] SCHEDULED durumundaki maç için "Maç Bitti" butonunun göründüğünü kontrol et
- [ ] "Maç Bitti" butonuna tıklayınca maçın PLAYED durumuna geçtiğini kontrol et
- [ ] PLAYED durumundaki maç için "Skor Bildir" butonunun göründüğünü kontrol et

#### 2.2 Skor Girişi - Set 1 ve Set 2
- [ ] Geçerli skor girişi testleri:
  - [ ] 6-0 skorunu gir ve başarılı olduğunu kontrol et
  - [ ] 6-4 skorunu gir ve başarılı olduğunu kontrol et
  - [ ] 7-5 skorunu gir ve başarılı olduğunu kontrol et
  - [ ] 7-6 skorunu gir ve tiebreak checkbox'ının göründüğünü kontrol et
  - [ ] 7-6 skorunda tiebreak işaretlemeden göndermeyi dene, hata vermeli
  - [ ] 7-6 skorunda tiebreak işaretleyip tiebreak skorunu gir (örn: 7-5) ve başarılı olduğunu kontrol et

#### 2.3 Skor Girişi - Set 3 (Süper Tiebreak)
- [ ] Set 1 ve Set 2'yi farklı oyuncular kazandığında Set 3'ün göründüğünü kontrol et
- [ ] Set 1 ve Set 2'yi aynı oyuncu kazandığında Set 3'ün görünmediğini kontrol et
- [ ] Set 3 için normal set skoru girişi (6-4, 7-5, vb.)
- [ ] Set 3 için süper tiebreak seçeneğini işaretle
- [ ] Süper tiebreak skorunu gir (örn: 10-8) ve başarılı olduğunu kontrol et
- [ ] Geçersiz süper tiebreak skorlarını test et (örn: 10-9, 9-8)

#### 2.4 Skor Validasyonu
- [x] ✅ **KOD ANALİZİ**: `validateSetScore` fonksiyonu geçersiz skorları kontrol ediyor:
  - [x] 5-4 gibi geçersiz skorlar reddediliyor (6'ya ulaşmadan bitmiş)
  - [x] 7-6 skorunda tiebreak zorunlu kontrolü var
  - [x] 6-6 skoru tiebreak olmadan reddediliyor
- [x] ✅ **KOD ANALİZİ**: `validateTennisScore` fonksiyonu:
  - [x] Maçın 2 set kazanan tarafından kazanıldığını kontrol ediyor
  - [x] 3 set girildiğinde ilk 2 setin farklı oyuncular tarafından kazanıldığını kontrol ediyor
- [ ] Runtime testleri: Geçersiz skorların gerçekten reddedildiğini kontrol et

#### 2.5 Skor Bildirimi API
- [x] ✅ **KOD ANALİZİ**: `/api/matches/[id]/report-score` endpoint'i:
  - [x] Authorization kontrolü var (401 Unauthorized)
  - [x] Oyuncunun maçta olup olmadığı kontrol ediliyor (403 Forbidden)
  - [x] Maç durumu PLAYED kontrolü var (400 Bad Request)
  - [x] Onaylanmış maç için skor bildirimi engelleniyor
  - [x] scoreStatus güncelleme mantığı doğru: PENDING → REPORTED_BY_HOME/AWAY → REPORTED_BY_BOTH
  - [x] Input validasyonu var (sets array kontrolü)
  - [x] Tennis score validasyonu yapılıyor
- [ ] Runtime testleri: Gerçek API çağrıları ile test et

#### 2.6 Skor Güncelleme
- [ ] Daha önce bildirilmiş skor için "Skoru Güncelle" butonunun göründüğünü kontrol et
- [ ] Skor güncellemesinin çalıştığını kontrol et

---

### 3. Manager Onay Süreci Testleri

#### 3.1 Onay Bekleyen Maçlar Sekmesi
- [x] ✅ **KOD ANALİZİ**: Manager dashboard'da:
  - [x] "Onaylanmayı Bekleyen Maçlar" sekmesi tanımlı
  - [x] Tab state yönetimi var (activeTab: "leagues" | "pending")
  - [x] Badge ile maç sayısı gösterimi var
  - [x] fetchPendingMatches fonksiyonu tanımlı
- [ ] Runtime testleri: UI'da sekmenin göründüğünü ve çalıştığını kontrol et

#### 3.2 Skor Karşılaştırma
- [x] ✅ **KOD ANALİZİ**: Manager pending matches sayfasında:
  - [x] homeReport ve awayReport ayrı ayrı bulunuyor
  - [x] İki skor yan yana grid layout'ta gösteriliyor
  - [x] Skor yoksa "Henüz skor bildirilmedi" mesajı gösteriliyor
  - [x] formatTennisScore ile skor formatlanıyor
  - [x] createdAt tarih/saat bilgisi gösteriliyor
- [ ] Runtime testleri: UI'da görünümü kontrol et

#### 3.3 Skor Onaylama
- [x] ✅ **KOD ANALİZİ**: `/api/matches/[id]/approve` endpoint'i:
  - [x] Manager yetki kontrolü var
  - [x] scoreReportId ile onaylama yapılıyor
  - [x] convertToHomeAway ile skor dönüştürülüyor
  - [x] Match tablosuna setsWonHome, setsWonAway, gamesWonHome, gamesWonAway kaydediliyor
  - [x] finalScoreReportId set ediliyor
  - [x] scoreStatus APPROVED olarak güncelleniyor
  - [x] status PLAYED olarak güncelleniyor
- [ ] Runtime testleri: Gerçek onaylama işlemini test et

#### 3.4 Manager Doğrudan Skor Girişi
- [x] ✅ **KOD ANALİZİ**: Manager dashboard'da:
  - [x] "Skor Gir (Manager)" butonu var
  - [x] Modal açılıyor ve TennisScoreInput component'i gösteriliyor
  - [x] `/api/matches/[id]` endpoint'inde managerDirectEntry flag'i ile işlem yapılıyor
  - [x] scoreStatus MANAGER_ENTERED olarak set ediliyor
  - [x] Skor validasyonu yapılıyor
- [ ] Runtime testleri: Gerçek manager skor girişini test et

#### 3.5 Yetki Kontrolleri
- [x] ✅ **KOD ANALİZİ**: `/api/matches/pending-approval` endpoint'i:
  - [x] Manager ve SUPERADMIN kontrolü var (403 Forbidden)
  - [x] League managerId filtresi var (SUPERADMIN hariç)
- [x] ✅ **KOD ANALİZİ**: `/api/matches/[id]/approve` endpoint'i:
  - [x] League managerId kontrolü var (403 Forbidden)
- [ ] Runtime testleri: Gerçek yetki kontrollerini test et

---

### 4. Lig Puan Tablosu Testleri

#### 4.1 Tablo Kolonları
- [x] ✅ **KOD ANALİZİ**: Lig detay sayfasında (`src/app/manager/leagues/[id]/page.tsx`):
  - [x] Tablo başlıkları doğru: #, İsim/Takım, Maç Sayısı, Galibiyet, Mağlubiyet, Kazandığı Set, Kaybettiği Set, Kazandığı Oyun, Kaybettiği Oyun, Set Averajı, Oyun Averajı
  - [x] LeagueTableEntry interface'i tüm alanları içeriyor
  - [x] Tablo rendering kodu mevcut
- [ ] Runtime testleri: UI'da tablonun göründüğünü kontrol et

#### 4.2 Puan Hesaplama - Takım Ligi (DOUBLES)
- [x] ✅ **KOD ANALİZİ**: `calculateTable` fonksiyonunda:
  - [x] DOUBLES format için team-based hesaplama var
  - [x] Sadece APPROVED veya MANAGER_ENTERED maçlar sayılıyor
  - [x] Sets ve games doğru şekilde ekleniyor
  - [x] Win/loss hesaplaması setsWonHome > setsWonAway kontrolü ile yapılıyor
  - [x] Set ve game averajları hesaplanıyor (division by zero kontrolü var)
- [ ] Runtime testleri: Gerçek maç onaylandıktan sonra tablonun güncellendiğini kontrol et

#### 4.3 Puan Hesaplama - Bireysel Lig (INDIVIDUAL)
- [x] ✅ **KOD ANALİZİ**: `calculateTable` fonksiyonunda:
  - [x] INDIVIDUAL format için player-based hesaplama var
  - [x] leaguePlayers üzerinden tablo oluşturuluyor
  - [x] homePlayer ve awayPlayer bazında hesaplama yapılıyor
  - [x] Oyuncu isimleri (lp.player.name) kullanılıyor
- [ ] Runtime testleri: Bireysel lig tablosunun doğru çalıştığını kontrol et

#### 4.4 Sıralama
- [x] ✅ **KOD ANALİZİ**: `calculateTable` fonksiyonunda sıralama:
  - [x] Önce won (galibiyet) sayısına göre descending
  - [x] Eşitlik durumunda setAverage'a göre descending
  - [x] Yine eşitlik durumunda gameAverage'a göre descending
- [ ] Runtime testleri: Gerçek verilerle sıralamanın doğru olduğunu kontrol et

#### 4.5 Onaylanmamış Maçlar
- [x] ✅ **KOD ANALİZİ**: `calculateTable` fonksiyonunda:
  - [x] Filter: `scoreStatus === ScoreStatus.APPROVED || scoreStatus === ScoreStatus.MANAGER_ENTERED`
  - [x] Sadece onaylanmış maçlar hesaplamaya dahil ediliyor
- [ ] Runtime testleri: Onaylanmamış maçların tabloya dahil edilmediğini kontrol et

---

### 5. Maç Sonuçları Gösterimi Testleri

#### 5.1 Oyuncu Maçlar Sayfası
- [x] ✅ **KOD ANALİZİ**: `src/app/player/matches/page.tsx`:
  - [x] Lig bilgisi badge olarak gösteriliyor (match.league.name)
  - [x] Onaylanmış maçlar için setsWonHome - setsWonAway gösteriliyor
  - [x] "Onay Bekliyor" badge'i scoreStatus kontrolü ile gösteriliyor
  - [x] myScoreReport ve opponentScoreReport ayrı ayrı gösteriliyor
  - [x] formatTennisScore ile skorlar formatlanıyor
- [ ] Runtime testleri: UI'da görünümü kontrol et

#### 5.2 Lig Detay Sayfası - Maç Sonuçları
- [x] ✅ **KOD ANALİZİ**: `src/app/manager/leagues/[id]/page.tsx`:
  - [x] Onaylanmış maçlar için setsWonHome - setsWonAway gösteriliyor
  - [x] Games bilgisi parantez içinde gösteriliyor: (gamesWonHome - gamesWonAway Oyun)
  - [x] "Onay Bekliyor" mesajı scoreStatus kontrolü ile gösteriliyor
  - [x] Hem homePlayer/homeTeam hem awayPlayer/awayTeam desteği var
- [ ] Runtime testleri: UI'da görünümü kontrol et

#### 5.3 İstatistikler
- [x] ✅ **KOD ANALİZİ**: `calculateStats` fonksiyonunda:
  - [x] Sadece APPROVED veya MANAGER_ENTERED maçlar sayılıyor
  - [x] Sets bazında win/loss hesaplanıyor
  - [x] Beraberlik kolonu kaldırılmış (draws: 0, grid-cols-3)
- [ ] Runtime testleri: İstatistiklerin doğru hesaplandığını kontrol et

---

### 6. Edge Case ve Hata Senaryoları

#### 6.1 Geçersiz Skor Senaryoları
- [x] ✅ **KOD ANALİZİ**: `validateSetScore` ve `validateTennisScore` fonksiyonları:
  - [x] 7-6 skorunda tiebreak zorunlu kontrolü var
  - [x] Tiebreak skoru validasyonu var (en az 7, 2 puan fark)
  - [x] Süper tiebreak validasyonu var (en az 10, 2 puan fark)
  - [x] İlk iki seti aynı oyuncu kazandığında 3. set reddediliyor
- [ ] Runtime testleri: Gerçek geçersiz skorların reddedildiğini kontrol et

#### 6.2 Yetki Kontrolleri
- [x] ✅ **KOD ANALİZİ**: 
  - [x] `/api/matches/[id]/report-score`: Oyuncunun maçta olup olmadığı kontrol ediliyor (403)
  - [x] `/api/matches/[id]/approve`: League managerId kontrolü var (403)
  - [x] `/api/matches/[id]/report-score`: Onaylanmış maç için skor bildirimi engelleniyor (400)
- [ ] Runtime testleri: Gerçek yetki kontrollerini test et

#### 6.3 Veri Tutarlılığı
- [x] ✅ **KOD ANALİZİ**: 
  - [x] `prisma.matchScoreReport.upsert` kullanılıyor - aynı oyuncu skorunu güncelleyebiliyor
  - [x] Manager sayfasında hem homeReport hem awayReport gösteriliyor
  - [x] Onaylanmış maç için skor bildirimi engelleniyor
- [ ] Runtime testleri: Veri tutarlılığını gerçek senaryolarla test et

#### 6.4 Boş/Null Değerler
- [x] ✅ **KOD ANALİZİ**: 
  - [x] `TennisScoreInput` component'inde set skorları undefined/null kontrolü var
  - [x] Tiebreak işaretlenmişse tiebreakScore kontrolü var
  - [x] API endpoint'inde input validasyonu var (sets array kontrolü)
- [ ] Runtime testleri: Boş değerlerin gerçekten reddedildiğini kontrol et

---

### 7. UI/UX Testleri

#### 7.1 Skor Girişi Formu
- [x] ✅ **KOD ANALİZİ**: `TennisScoreInput` component'inde:
  - [x] useEffect ile Set 3 görünürlüğü kontrol ediliyor (1-1 durumunda)
  - [x] Tiebreak checkbox'ı sadece 7-6 veya 6-7 durumunda gösteriliyor
  - [x] Süper tiebreak checkbox'ı sadece Set 3'te gösteriliyor
  - [x] Hata mesajları state'te tutuluyor ve gösteriliyor
- [ ] Runtime testleri: Formun responsive olduğunu ve UI davranışlarını kontrol et

#### 7.2 Manager Onay Sayfası
- [x] ✅ **KOD ANALİZİ**: Manager pending matches sayfasında:
  - [x] Grid layout ile iki skor yan yana gösteriliyor (md:grid-cols-2)
  - [x] Her skor için "Onayla" butonu var
  - [x] Onaylama sonrası fetchPendingMatches() ve fetchLeagues() çağrılıyor
- [ ] Runtime testleri: UI görünümünü ve buton işlevlerini kontrol et

#### 7.3 Lig Tablosu
- [x] ✅ **KOD ANALİZİ**: Lig tablosu rendering'inde:
  - [x] Averajlar `.toFixed(2)` ile 2 ondalık basamakla gösteriliyor
  - [x] Boş tablo durumunda mesaj var (colSpan={11})
  - [x] League format'a göre mesaj değişiyor (DOUBLES/INDIVIDUAL)
- [ ] Runtime testleri: Responsive tasarımı ve uzun isimleri kontrol et

---

### 8. Performans Testleri

#### 8.1 Sayfa Yükleme
- [ ] Oyuncu maçlar sayfasının hızlı yüklendiğini kontrol et
- [ ] Manager dashboard'un hızlı yüklendiğini kontrol et
- [ ] Lig detay sayfasının hızlı yüklendiğini kontrol et

#### 8.2 API Yanıt Süreleri
- [ ] Skor bildirimi API'sinin hızlı yanıt verdiğini kontrol et
- [ ] Onay bekleyen maçlar API'sinin hızlı yanıt verdiğini kontrol et
- [ ] Puan tablosu hesaplamasının hızlı olduğunu kontrol et

---

### 9. Entegrasyon Testleri

#### 9.1 Tam Akış Testi
- [ ] Maç oluştur (fikstür)
- [ ] Oyuncu 1 maçı PLAYED olarak işaretle
- [ ] Oyuncu 1 skor bildir
- [ ] Oyuncu 2 skor bildir
- [ ] Manager onay bekleyen maçları gör
- [ ] Manager bir skoru onayla
- [ ] Lig puan tablosunun güncellendiğini kontrol et
- [ ] Maç sonuçlarının göründüğünü kontrol et

#### 9.2 Manager Doğrudan Giriş Akışı
- [ ] Manager onay bekleyen maçlar sayfasına git
- [ ] "Skor Gir (Manager)" butonuna tıkla
- [ ] Skor gir ve kaydet
- [ ] Maçın MANAGER_ENTERED durumuna geçtiğini kontrol et
- [ ] Lig puan tablosunun güncellendiğini kontrol et

---

### 10. Veri Doğrulama Testleri

#### 10.1 Oyun Sayısı Hesaplama
- [x] ✅ **KOD ANALİZİ**: `calculateGames` fonksiyonunda:
  - [x] Normal set: gamesWon += set.reporter, gamesLost += set.opponent (6-4 = 10 oyun)
  - [x] Tiebreak set: 6+6+1 = 13 oyun (gamesWon += 6, gamesLost += 6, gamesWon += 1)
  - [x] Süper tiebreak: 1+1 = 2 oyun (her iki taraf için 1 oyun)
- [ ] Runtime testleri: Gerçek skorlarla oyun sayısını kontrol et

#### 10.2 Set Averajı Hesaplama
- [x] ✅ **KOD ANALİZİ**: `calculateTable` fonksiyonunda:
  - [x] `entry.setAverage = entry.setsLost > 0 ? entry.setsWon / entry.setsLost : entry.setsWon`
  - [x] Division by zero kontrolü var

#### 10.3 Oyun Averajı Hesaplama
- [x] ✅ **KOD ANALİZİ**: `calculateTable` fonksiyonunda:
  - [x] `entry.gameAverage = entry.gamesLost > 0 ? entry.gamesWon / entry.gamesLost : entry.gamesWon`
  - [x] Division by zero kontrolü var
- [ ] Runtime testleri: Gerçek verilerle averajları kontrol et

---

## Test Sonuçları

### Başarılı Testler
- ✅ **ScoreStatus Enum Kontrolü**: Prisma Client üzerinden enum değerleri kontrol edildi - 6 değer mevcut ve doğru (PENDING, REPORTED_BY_HOME, REPORTED_BY_AWAY, REPORTED_BY_BOTH, APPROVED, MANAGER_ENTERED)
- ✅ **MatchScoreReport Tablosu Schema Kontrolü**: Prisma schema'da tablo ve tüm kolonlar doğru tanımlı, unique constraint mevcut
- ✅ **Match Tablosu Yeni Kolonlar Schema Kontrolü**: Tüm yeni kolonlar (scoreStatus, setsWonHome, setsWonAway, gamesWonHome, gamesWonAway, finalScoreReportId) schema'da doğru tanımlı

### Başarısız Testler
- Yok

### Notlar
- **Veritabanı Bağlantısı**: Runtime testleri için veritabanı bağlantısı gerekiyor. Test scripti (`scripts/test-db-schema.ts`) oluşturuldu ancak DATABASE_URL environment variable'ı bulunamadığı için tam runtime testleri yapılamadı.
- **Schema Kontrolleri**: Prisma schema dosyası üzerinden yapılan kontroller başarılı. Tüm tablolar, kolonlar ve constraint'ler schema'da doğru tanımlı.
- **Prisma Client**: Prisma Client generate edildi ve ScoreStatus enum'ı başarıyla kontrol edildi.
- **Test Scripti**: `scripts/test-db-schema.ts` dosyası oluşturuldu. Veritabanı bağlantısı sağlandığında bu script çalıştırılarak runtime testleri yapılabilir.

---

## Test Tarihi
- Başlangıç: 2025-11-11
- Bitiş: 2025-11-11
- Test Eden: Automated Test Script + Manual Schema Review 

