# Hammock

> Bir JSON klasörünü tek komutla çalışan bir mock API'ye dönüştürün — arka uç kodu yok, yapılandırma dosyası yok, bağımlılık yok.

![Node.js 22+](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white) ![MIT Lisansı](https://img.shields.io/badge/license-MIT-blue) ![0 bağımlılık](https://img.shields.io/badge/dependencies-0-brightgreen)

[English Documentation](README.md) · **Türkçe Dokümantasyon**

## Yerel kullanım uyarısı

> [!WARNING]
> **Hammock yalnızca yerel geliştirme içindir ve güvenliği sağlanmış bir araç değildir.** Kimlik doğrulama yoktur, yetkilendirme yoktur; ne `127.0.0.1` adresine bağlanması ne de salt okunur davranışı bir erişim denetimi sınırıdır. Üretim ortamında veya genel erişime açık bir sunucuda asla kullanmayın; port yönlendirme, ters proxy ya da tünel üzerinden asla genel erişime açmayın.
>
> **Yalnızca sentetik mock verisi barındıran ayrı bir klasör sunun.** O klasördeki adreslenebilir her `.json` dosyası — nokta ile başlayan gizli dosyalar dahil — adresi bilindiğinde veya tahmin edildiğinde okunabilir; dizin listelemesinin olmaması gizlilik anlamına gelmez. Sunulan klasöre gizli bilgiler, token'lar, kimlik bilgileri, özel anahtarlar, üretim verisi ya da müşteri verisi koymayın.
>
> **Hammock'u ev dizininizden, gerçek bir proje ya da depo kökünden veya güvenmediğiniz bir projeden başlatmayın**, çünkü `package.json` gibi dosyalar da adreslenebilir hale gelir. İşiniz bittiğinde sunucuyu Ctrl+C ile durdurun.

## Neden Hammock?

- **Tek komut, sıfır kurulum.** Bir klasörün içinde `hammock` komutunu çalıştırın; içindeki her JSON dosyası bir uç noktaya dönüşür.
- **Adresler klasörlerinizi yansıtır.** Adres derinliği iç içe klasörleri ifade eder ve URL düzeni hiç değişmez.
- **Ek paket gerekmez.** Hammock yalnızca Node.js'in yerleşik modülleriyle çalışır.
- **Portu kendisi seçer.** Hammock `3000` portundan başlayarak ilk boş portu alır. İsterseniz `--port`komutuyla belirli bir portu sabitler.
- **Her zaman güncel.** Dosyalar her istekte yeniden okunur, bu yüzden değişiklikler yeniden başlatma gerektirmeden görünür.

Hammock ön yüz çalışmalarına uygundur: bir ekranı prototipleyin, bir özelliğin ön gösterimini (demo) oluşturun ya da gerçek API ortaya çıkmadan müşteriye gerçekçi yanıtlar verin.

## Hızlı başlangıç

Hammock için Node.js 22 sürümü veya daha yenisi gerekir:

```bash
node --version
```

Global olarak kurun:

```bash
npm install -g @hammock/hammock-cli
```

Bir iki JSON dosyası olan bir klasör oluşturun:

```text
projem/
├── kullanicilar.json
└── siparisler/
    └── son.json
```

```json
{
  "id": 1,
  "isim": "Ada Lovelace",
  "rol": "gelistirici"
}
```

Hammock'u o klasörden başlatın:

```bash
cd projem
hammock
```

```text
Serving /path/to/my-project
Listening on http://127.0.0.1:3000
```

İki uç nokta artık çalışıyor:

- http://127.0.0.1:3000/kullanicilar
- http://127.0.0.1:3000/siparisler/son

Hammock başlatıldığı klasörü sunar ve yalnızca `127.0.0.1` üzerinde dinler, bu yüzden bu uç noktalar yalnızca sizin makinenizde çalışır.

## Adresler nasıl çalışır?

Hammock, URL'nin son bölümüne `.json` ekler, bu yüzden adreslerde uzantı yer almaz:

| Dosya | URL |
|---|---|
| `kullanicilar.json` | `/kullanicilar` |
| `siparisler/son.json` | `/siparisler/son` |
| `api/v1/urunler.json` | `/api/v1/urunler` |

- Sorgu parametreleri yok sayılır: `/kullanicilar?rol=admin` isteği `kullanicilar.json` dosyasını sunar.
- Son bölümü `.json` ile biten bir URL `404` döndürür; yani `/kullanicilar.json` değil `/kullanicilar` isteyin.
- İç içe klasörler her derinlikte çalışır ve dizin listelemesi hiçbir zaman sunulmaz.
- Sunulan klasörün dışına çıkan sembolik bağlantılar sunulmaz ve `404` döndürür.
- Her istek dosyayı diskten yeniden okur ve tamamen belleğe alır, bu yüzden mock dosyaları makul boyutta tutun.

## İstekler ve tarayıcı erişimi

Hammock sadece okur: hiçbir dosyayı oluşturmaz, değiştirmez veya silmez.

| Yöntem | Sonuç |
|---|---|
| `GET`, `POST`, `PUT` | Aynı JSON dosyası döndürülür |
| `OPTIONS` | `204` ön kontrol yanıtı |
| Diğerleri | `Allow` başlığıyla `405` |

POST ve PUT gövdeleri okunur ve görmezden gelinir. `1 MiB` değerinden büyük bir gövde `413` ile reddedilir.

> **CORS tamamen devredışı bırakılmıştır.** Hammock, sözdizimsel olarak geçerli tek bir `http` veya `https` `Origin` değerini `Access-Control-Allow-Origin` başlığında yansıtır ve bu yansıtma bir kaynak izin listesi değildir. Eksik veya geçersiz `Origin` için CORS yanıt başlığı gönderilmez, ancak istek yine normal şekilde işlenir. `Access-Control-Allow-Credentials` hiçbir zaman gönderilmez, bu yüzden `credentials: 'include'` gibi kimlik bilgisi içeren tarayıcı istekleri desteklenmez. Tarayıcınızın bu sunucuya erişmesine izin verdiği her `http` veya `https` sayfası — sizin oluşturmadığınız siteler dahil — sunulan JSON'u okuyabilir; tarayıcı olmayan istemciler ise CORS'u tamamen yok sayabilir.

## Seçenekler

| Seçenek | Açıklama |
|---|---|
| `-p, --port <number>` | Belirli bir port kullanır: `1` ile `65535` arasında bir tam sayı |
| `--https` | HTTPS üzerinden sunar; `--cert` ve `--key` gerektirir |
| `--cert <path>` | PEM sertifikası veya sertifika zinciri |
| `--key <path>` | PEM özel anahtarı |
| `-h, --help` | Yardım metnini gösterir |
| `-v, --version` | Sürüm numarasını gösterir |

`--port` verilmezse Hammock `3000` portundan başlar ve boş bir port bulana kadar yukarı doğru ilerler. `--port` verildiğinde dolu bir port başlatmayı hatayla durdurur; byle bir durumda seçeneği kaldırıp Hammock'un portu seçmesine izin verin veya başka bir port seçin. `--cert` ve `--key` yalnızca `--https` ile birlikte geçerlidir ve bunlardan biri eksikse `--https` başarısız olur.

## HTTPS

```bash
hammock --https --cert ./cert.pem --key ./key.pem
```

Sertifika tarayıcınız tarafından güvenilir olmalı ve `127.0.0.1` için geçerli olmalıdır; `Subject Alternative Names` alanında `localhost` bulunması ideal olur. Hammock sertifika oluşturmaz, indirmez ve bir sertifika otoritesiyle iletişim kurmaz. Sertifika veya anahtar okunamaz ya da yüklenemezse sunucu başlamaz; hiçbir zaman HTTP'ye geri dönmez.

HTTPS yalnızca taşıma katmanını korur. Genel erişime açmayı, proxy kullanmayı veya tünellemeyi güvenli hale getirmez.

> [!IMPORTANT]
> **Sertifika ve anahtar dosyalarını sunulan klasörün dışında tutun ve özel anahtara erişimi kısıtlayın.** Üretim özel anahtarını asla yeniden kullanmayın veya sürüm kontrolüne eklemeyin; yerel geliştirmeye özel bir sertifika kullanın.

macOS veya Linux'ta anahtar dosyasının izinlerini sıkılaştırabilirsiniz:

```bash
chmod 600 key.pem
```

Yerel olarak güvenilen bir sertifika için `mkcert` kullanabilirsiniz:

```bash
mkcert -install
mkcert -cert-file cert.pem -key-file key.pem 127.0.0.1 localhost
```

`mkcert -install` tarayıcıların ve uygulamaların güvendiği yerel bir kök sertifika otoritesi kurar. Bu komutu yalnızca sahibi olduğunuz ve anladığınız bir makinede çalıştırın.

## Sorun giderme

| Sorun | Çözüm |
|---|---|
| Dosya var olduğu halde `404` | URL muhtemelen `.json` ile bitiyor ya da yol yanlış; `/siparisler/son.json` değil `/siparisler/son`'a gitmeyi deneyin. |
| Sembolik bağlantılı dosyada `404` | Bağlantı sunulan klasörün dışına çıkıyor, bu yüzden Hammock onu sunmayı reddeder. |
| Port zaten kullanımda | `--port`ile sabitlenen port kullanılıyor; `--port` seçeneğini kaldırın veya farklı bir port seçin. |
| Tarayıcı sertifika uyarısı | Sertifika güvenilir değil ya da `127.0.0.1` adresini kapsamıyor; güveni ve `Subject Alternative Names` alanını kontrol edin. |
| `413` | Bir POST veya PUT gövdesi `1 MiB` değerinden büyük. |
| `405` | Yöntem `GET`, `POST`, `PUT` veya `OPTIONS` değil. |
| `curl` çıktısında CORS başlığı yok | Geçerli bir `Origin` başlığı gönderilmedi; bu beklenen bir durumdur ve istek yine de sunulur. |

## Lisans

Hammock MIT Lisansı ile yayımlanır. Tam metin için [LICENSE](LICENSE) dosyasına bakın.
