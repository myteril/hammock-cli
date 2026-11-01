# Hammock

Hammock, klasörünüzdeki JSON dosyalarını tek komutla kullanılabilir bir mock API'ye dönüştürür.

Hammock yalnızca yerel geliştirme içindir. Üretim ortamında kullanmayın.

## Güvenlik ve Yerel Kullanım

Hammock'u çalıştırmadan önce aşağıdaki noktaları gözden geçirin:

- **Yalnızca yerel geliştirme içindir.** Üretim ortamında, herkese açık sunucularda veya güvenilmeyen ağlarda kullanmayın.
- **CORS bir erişim denetimi değildir.** Hammock, joker karakter (`*`) yerine isteğin geçerli `Origin` değerini yansıtır; bu bir kaynak izin listesi değildir. Hammock çalışırken, tarayıcınızdaki herhangi bir geçerli `http` veya `https` web sitesi sunulan JSON dosyalarını okuyabilir. Çerezler ve HTTP kimlik doğrulaması gibi kimlik bilgileri desteklenmez. Bu nedenle yalnızca bu iş için ayrılmış bir mock veri klasöründe çalıştırın.
- **Gizli dosyalar dahil tüm `.json` dosyaları sunulabilir.** Sır, token, kimlik bilgisi, özel anahtar veya müşteri verisi içeren dosyaları bu klasöre koymayın.
- **Ev klasörünüzde veya güvenmediğiniz projelerde çalıştırmayın.** Sunulan klasördeki her JSON dosyası erişilebilir hale gelir.
- **İşiniz bitince sunucuyu durdurun.** Ctrl+C ile kapatın. Hammock'u port yönlendirme, ters proxy veya tünel ile dışarı açmayın.
- **Sertifika ve anahtarlarınızı koruyun.** Bu dosyaları sunulan klasörün dışında tutun ve dosya izinlerini kısıtlayın. Özel anahtarınızı paylaşmayın.
- **`mkcert` yerel bir kök CA kurar.** Yalnızca etkisini anladığınız makinelerde kullanın.

## Neden Hammock?

- **Tek komut yeterlidir.** Klasörünüzde `hammock` çalıştırın; JSON dosyalarınız kullanıma hazır olsun.
- **Alt klasörler desteklenir.** İstediğiniz derinlikteki JSON dosyalarını aynı basit adres düzeniyle sunun.
- **Port seçimi otomatiktir.** Boş bir port bulunur; isterseniz `--port` ile belirli bir port seçersiniz.
- **Ek paket gerekmez.** Hammock, Node.js'in yerleşik modülleriyle çalışır.

## Kurulum

Node.js 22 veya üzeri bir sürüm gerekir. Sürümünüzü kontrol etmek için:

```bash
node --version
```

Hammock'u global olarak kurun:

```bash
npm install -g @hammock/hammock-cli
```

## Hızlı Başlangıç

Örnek bir klasör yapısı:

```text
projem/
├── kullanicilar.json
└── siparisler/
    └── son.json
```

`kullanicilar.json` dosyası:

```json
{
  "id": 1,
  "ad": "Ayşe Yılmaz",
  "rol": "gelistirici"
}
```

Klasöre gidin ve Hammock'u başlatın:

```bash
cd projem
hammock
```

Hammock, sunulan klasörü ve adresi yazdırır:

```text
Serving /sizin/projem
Listening on http://127.0.0.1:3000
```

Tarayıcınızda şu adresleri açabilirsiniz:

- http://127.0.0.1:3000/kullanicilar
- http://127.0.0.1:3000/siparisler/son

## Adresler Nasıl Çalışır?

Adreslerde `.json` uzantısı yazılmaz. Hammock, adresin son parçasına `.json` ekleyerek dosyayı bulur:

| Dosya | Adres |
|---|---|
| `kullanicilar.json` | `/kullanicilar` |
| `siparisler/son.json` | `/siparisler/son` |
| `api/v1/urunler.json` | `/api/v1/urunler` |

- Alt klasörlerin derinliği önemli değildir.
- Adresin sonundaki sorgu parametreleri yok sayılır.
- `/siparisler/son.json` gibi uzantı içeren adresler çalışmaz ve 404 döner.
- Klasör listesi sunulmaz; yalnızca JSON dosyaları döner.
- Dosyalar her istekte yeniden okunur; değişiklikler sunucuyu yeniden başlatmadan görünür.

## Seçenekler

| Seçenek | Açıklama |
|---|---|
| `-p, --port <sayı>` | Belirli bir portu kullanır (1-65535). |
| `--https` | HTTPS'i etkinleştirir; `--cert` ve `--key` birlikte gerekir. |
| `--cert <dosya>` | PEM sertifika veya sertifika zinciri. |
| `--key <dosya>` | PEM özel anahtar. |
| `-h, --help` | Yardım metnini gösterir. |
| `-v, --version` | Sürüm numarasını gösterir. |

## Port Seçimi

`--port` vermezseniz Hammock 3000'den başlayarak boş bir port arar. Örneğin 3000 kullanımdaysa 3001'e geçer.

Belirli bir portu kullanmak için:

```bash
hammock --port 4000
```

`--port` ile verdiğiniz port kullanımdaysa Hammock başlamaz ve farklı bir port seçmenizi önerir. Bu durumda seçeneği kaldırarak otomatik seçime izin verebilirsiniz.

## HTTPS

Varsayılan olarak Hammock HTTP ile çalışır. HTTPS kullanmak için `--https` seçeneğiyle birlikte bir sertifika ve özel anahtar dosyası verin:

```bash
hammock --https --cert ./cert.pem --key ./key.pem
```

Sertifikanızın tarayıcınız tarafından güvenilir olması ve yazdırılan `127.0.0.1` adresi için geçerli olması gerekir. Sertifikayı `localhost` için de geçerli kılarsanız `https://localhost:<port>` adresini kullanabilirsiniz. Bunun için sertifikanın Konu Alternatif Adları (Subject Alternative Name, SAN) alanında `127.0.0.1` ve tercihen `localhost` bulunmalıdır. Sertifika dosyanız, sertifika otoritenizin gerektirdiği durumlarda tam zinciri içermelidir.

Hammock sertifika üretmez, indirmez veya bir sertifika otoritesine başvurmaz. Yalnızca sizin verdiğiniz dosyaları kullanır. Sertifika veya anahtar okunamıyor ya da yüklenemiyorsa sunucu hiç başlamaz; Hammock sessizce HTTP'ye dönmez.

Yerel geliştirme için `mkcert` ile güvenilir bir sertifika oluşturabilirsiniz:

```bash
mkcert -install
mkcert -cert-file cert.pem -key-file key.pem 127.0.0.1 localhost
```

`mkcert -install` makinenizde yerel bir kök CA kurar. Bu adımı yalnızca etkisini anladığınızda ve güvendiğiniz bir makinede yapın.

Kendinden imzalı sertifikalar tarayıcıda güvenlik uyarısı gösterir. Hassas verilerle çalışırken bu uyarıları geçmeyin; tarayıcınızın güvendiği bir sertifika kullanın.

Sertifika ve anahtar dosyalarını sunulan klasörün dışında tutun. Özellikle özel anahtar dosyasının izinlerini kısıtlayın:

```bash
chmod 600 key.pem
```

## İstek Türleri

GET, POST ve PUT isteklerinin tümü aynı JSON dosyasını döndürür. Hammock salt okunurdur; dosyaları oluşturmaz, değiştirmez veya silmez.

POST ve PUT isteklerinin gövdeleri okunur ve yok sayılır. İzin verilen sınırı aşan gövdeler 413 hatasıyla reddedilir. Diğer istek türleri 405 hatası döndürür.

## CORS

Hammock, joker karakter (`*`) yerine isteğin `Origin` başlığını yansıtır. Tarayıcıdan gelen çapraz kaynaklı bir istekte tam olarak bir `Origin` başlığı bulunmalı ve değeri şema, ana bilgisayar ve isteğe bağlı porttan oluşan kurallı bir `http` veya `https` kaynağı olmalıdır. Geçerli kaynak, `Access-Control-Allow-Origin` başlığında değiştirilmeden yansıtılır. Her yanıtta `Vary: Origin, Access-Control-Request-Headers` başlığı döner.

Eksik, bozuk, `null`, yinelenen, virgülle ayrılmış liste veya `http`/`https` dışı bir `Origin` değeri için CORS yanıt başlıkları gönderilmez; istek yine normal şekilde işlenir. `Access-Control-Allow-Credentials` hiçbir zaman gönderilmez. Bu nedenle `credentials: 'include'` kullanan tarayıcı istekleri desteklenmez.

Joker karakter (`*`) kimlik bilgisi içermeyen istekler için geçerlidir ve yalnızca kimlik bilgisi kullanan isteklerde kısıtlanır. Hammock kimlik bilgisi desteklemediği için kaynak yansıtma erişim denetimi sağlamaz ve joker karakterle aynı tarayıcı okuma erişimini sürdürür. CORS bir kimlik doğrulama mekanizması değildir; tarayıcı dışı istemciler `Origin` başlığını taklit edebilir.

Geçerli kaynak içeren `OPTIONS` ön kontrol istekleri 204 durumuyla izin verilen yöntemleri ve doğrulanmış istenen başlıkları döndürür. Geçersiz kaynaklı ön kontrol istekleri yine 204 döner ancak CORS yanıt başlıkları içermez.

## Sorun Giderme

- **404 alıyorum.** Adreste `.json` uzantısı olmamalıdır. `siparisler/son.json` dosyası `/siparisler/son` adresinden sunulur; `/siparisler/son.json` çalışmaz. Dosyanın gerçekten klasörde olduğundan emin olun.
- **Port kullanımda hatası alıyorum.** `--port` ile verdiğiniz port başka bir uygulama tarafından kullanılıyor olabilir. Seçeneği kaldırıp boş bir portun otomatik seçilmesini sağlayın veya farklı bir port seçin.
- **Tarayıcı sertifika uyarısı gösteriyor.** Sertifika tarayıcınız tarafından güvenilmiyor veya `127.0.0.1` adresini kapsamıyor olabilir. SAN alanında `127.0.0.1` ve tercihen `localhost` bulunduğundan emin olun.
- **413 hatası alıyorum.** POST veya PUT isteğinin gövdesi izin verilen sınırı aşıyor. Hammock istek gövdelerini 1 MiB ile sınırlar.
- **Dosyam 404 dönüyor ama klasörde duruyor.** Klasör dışına işaret eden bir sembolik bağlantı olabilir. Hammock yalnızca sunulan klasörün içinde kalan hedeflere izin verir.
- **405 hatası alıyorum.** Yalnızca GET, POST, PUT ve OPTIONS istekleri desteklenir.
- **`curl` veya tarayıcı dışı bir istemcide CORS başlığı görmüyorum.** `Origin` başlığı gönderilmediğinde CORS yanıt başlıkları eklenmez. Bu durum beklenen davranıştır.
- **Tarayıcıda CORS hatası alıyorum.** `Origin` değeri eksik, bozuk, `null`, yinelenen, virgülle ayrılmış liste veya `http`/`https` dışı olabilir. Sayfayı geçerli bir `http` veya `https` kaynağından açın.
- **Sayfayı `file://` ile veya sandbox uygulanmış bir iframe içinde açtım.** Bu bağlamlar geçerli bir `http`/`https` kaynağı göndermez; sayfayı `http` veya `https` üzerinden sunun.
- **Kimlik bilgili istek kullanıyorum.** `credentials: 'include'` desteklenmez; Hammock `Access-Control-Allow-Credentials` başlığını göndermez.
- **HTTPS sayfası HTTP Hammock örneğine istek gönderiyor.** Tarayıcı karışık içeriği engeller. Gerekirse Hammock'u `--https` ve tarayıcınızın güvendiği bir sertifikayla çalıştırın.
- **`localhost` ve `127.0.0.1` farklı kaynaklardır.** Tarayıcı bu adresleri ayrı kaynak olarak değerlendirir; isteğin geldiği adresle tutarlı bir `Origin` değeri kullanın.
- **Çok büyük JSON dosyaları bellek kullanımını artırabilir.** Hammock dosyayı her istekte tamamen belleğe okur; çok büyük mock dosyaları yerine daha küçük dosyalar tercih edin.


## Kapatma

Sunucuyu durdurmak için terminalde Ctrl+C tuşlarına basın. Hammock'u işiniz bittiğinde çalışır durumda bırakmayın.

## Lisans

MIT. Ayrıntılar için `LICENSE` dosyasına bakın.

Hammock yalnızca yerel geliştirme içindir. Üretim ortamında kullanmayın.
