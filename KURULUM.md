# Instagram Söz Botu: Kurulum

Bot her akşam **20:00'de** (Türkiye saati) sıradaki ayeti, hadisi veya sözü şık bir görsele çevirip Instagram'a **kendisi paylaşır**.
GitHub Actions üzerinde çalıştığı için **bilgisayarının açık olması gerekmez** ve ücretsizdir.

Kurulum bir kez yapılır, yaklaşık 20-30 dakika sürer.

---

## 1. Instagram hesabını hazırla
1. Instagram uygulamasında: **Ayarlar → Hesap türü ve araçlar → Profesyonel hesaba geç** (İşletme veya İçerik üreticisi).
2. Bir **Facebook sayfası** aç (yoksa) ve Instagram hesabını bu sayfaya bağla:
   Instagram'da **Profili düzenle → Sayfa** ya da Facebook sayfa ayarlarında **Bağlı hesaplar → Instagram**.

## 2. Meta geliştirici uygulaması oluştur
1. https://developers.facebook.com adresine gir ve Facebook hesabınla giriş yap.
2. **Uygulamalarım → Uygulama oluştur** → kullanım durumu olarak **"Diğer"**, tür olarak **"İşletme" (Business)** seç.
3. Uygulama panelinde **Ürün ekle → Instagram** (Facebook Girişi ile Instagram API) ekle.
4. **Uygulama ayarları → Temel** kısmından **Uygulama Kimliği (App ID)** ve **Uygulama Gizli Anahtarı (App Secret)** değerlerini not al.

> Uygulama "Geliştirme" modunda kalabilir. Sen uygulamanın yöneticisi olduğun için kendi hesabında paylaşım yapabilirsin, Meta incelemesine gerek yok.

## 3. Token al
1. https://developers.facebook.com/tools/explorer adresine git (Graph API Explorer).
2. Sağ üstte **kendi uygulamanı** seç.
3. **İzinler** kısmına şunları ekle:
   `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `business_management`
4. **Generate Access Token** düğmesine bas, açılan pencerede sayfanı ve Instagram hesabını seçip onayla. Çıkan token **kısa ömürlüdür** (1 saat).
5. Bu klasörde bir terminal aç ve şunu çalıştır (değerleri kendininkilerle değiştir):

```powershell
npm install
node src/daily.js token APP_ID APP_SECRET KISA_TOKEN
```

Çıktıda **IG_USER_ID** ve **IG_ACCESS_TOKEN** değerlerini görürsün. Bu token bir sayfa token'ıdır ve **süresi dolmaz**.
⚠️ Bu token'ı kimseyle paylaşma, hesabına paylaşım yapma yetkisi verir.

## 4. GitHub'a yükle
1. https://github.com adresinde ücretsiz hesap aç ve **yeni bir repo** oluştur (örneğin `instagram-soz-botu`).
   Repo **Public** olmalı, çünkü Instagram görseli bu repodaki linkten indiriyor. Token'lar gizli kalır, repoya yazılmaz.
2. Bu klasördeki her şeyi (`node_modules` ve `onizleme` hariç) repoya yükle.
   En kolay yol: repoda **Add file → Upload files**, klasörleri sürükle bırak. `.github` klasörünün de yüklendiğinden emin ol.
3. Repoda **Settings → Secrets and variables → Actions → New repository secret** kısmından iki secret ekle:
   - `IG_USER_ID`
   - `IG_ACCESS_TOKEN`

## 5. Ayarları kişiselleştir (`config.json`)
| Ayar | Açıklama |
|---|---|
| `hesapAdi` | Görselin altında yazan Instagram adın, örneğin `@gununsozu` |
| `paylasimSaati` | Paylaşım saati (varsayılan `20:00`). Değiştirirsen `.github/workflows/gunluk-paylasim.yml` içindeki cron saatini de **30 dakika önceye (UTC)** çek. |
| `hashtagler` | Her postun altına eklenen hashtag'ler |
| `baslangicTarihi` | Söz sırasının başladığı gün |

## 6. Test et
Repoda **Actions → Günlük Instagram paylaşımı → Run workflow** düğmesine bas ("hemen paylaş" seçili kalsın).
1-2 dakika içinde post Instagram'da görünmeli. Hata olursa kırmızı adıma tıklayınca nedenini görürsün.

Bundan sonra bot her akşam 20:00'de kendisi çalışır. Aynı gün iki kez paylaşmaz.

---

## Söz ekleme ve düzenleme
Tüm sözler `quotes.json` dosyasında durur. Yeni bir söz eklemek için şu formatta bir satır ekle:

```json
{ "tur": "hadis", "metin": "Söz metni", "kaynak": "Buhârî, Edeb, 18" }
```

`tur` değeri `ayet`, `hadis` veya `soz` olabilir. Görselin üstündeki başlık buna göre değişir.
Cuma günleri başlık otomatik olarak **"HAYIRLI CUMALAR"** olur. Sözler sırayla döner, liste bitince baştan başlar.

> ⚠️ **Kaynakları mutlaka kontrol et.** Listedeki ayet mealleri ve hadisler bilinen kaynaklardan derlendi ama yayına almadan önce
> **Diyanet Kur'an Meali** (kuran.diyanet.gov.tr) ve **Hadislerle İslam** (hadislerleislam.diyanet.gov.tr) üzerinden doğrulaman önerilir.
> Bölüm ve hadis numaraları farklı baskılarda değişebilir.

## Önizleme (kendi bilgisayarında)
```powershell
node src/daily.js onizleme 10
```
İlk 10 sözün görselleri `onizleme/` klasörüne kaydedilir.
