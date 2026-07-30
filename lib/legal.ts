// Single source of truth for the legal documents (Terms of Service + Privacy
// Policy), in English and Turkish. Rendered natively by app/legal/[doc].tsx and
// linked from the auth screens' consent footnote. English is the controlling
// version (stated inside both documents); the Turkish text is a courtesy
// translation. Body lines starting with "• " render as indented bullets.

export type LegalLang = "en" | "tr";
export type LegalDocId = "terms" | "privacy";

export type LegalSection = { heading: string; body: string[] };
export type LegalDoc = {
  title: string;
  /** Human-readable "Last updated" line, already localized. */
  updated: string;
  intro: string[];
  sections: LegalSection[];
};

export const LEGAL_CONTACT_EMAIL = "contact@kagusoftware.com";

const termsEn: LegalDoc = {
  title: "Terms of Service",
  updated: "Last updated: July 31, 2026",
  intro: [
    "These Terms of Service (“Terms”) govern your use of the PetPal mobile application and related services (together, the “Service”), provided by Kagu Software (“Kagu Software”, “we”, “us”). By creating an account or using the Service, you agree to these Terms. If you do not agree, please do not use the Service.",
    "These Terms are written in English and also provided in Turkish for convenience. If the two versions conflict, the English version controls to the extent permitted by applicable law.",
  ],
  sections: [
    {
      heading: "1. Who can use PetPal",
      body: [
        "You must be at least 13 years old to create an account. If you are under the age required by the law of your country to consent to online services, a parent or legal guardian must set up and supervise your use of the Service.",
        "You are responsible for the accuracy of the information you provide and for keeping your sign-in credentials secure. Let us know right away if you believe your account has been accessed without your permission.",
      ],
    },
    {
      heading: "2. Households and shared data",
      body: [
        "PetPal is built for families. When you join a household, the content in that household — pets, care logs, reminders, health records, and similar data — is shared with the other members of that household, according to each member's role (owner, admin, or member).",
        "Only invite people you trust. If you leave a household, data you contributed to it may remain part of the household's shared history.",
      ],
    },
    {
      heading: "3. Your content",
      body: [
        "You keep ownership of the content you add to the Service (for example pet profiles, notes, and records). You grant us the limited license needed to host, store, display, and sync that content so the Service can work — including sharing it with your household as described above. We do not use your content for advertising and we do not sell it.",
      ],
    },
    {
      heading: "4. PetPal is not veterinary advice",
      body: [
        "Care guides, plans, reminders, insights, and any other pet-care content in the Service are provided for general information only. They are not veterinary advice, diagnosis, or treatment, and they are no substitute for a qualified veterinarian.",
        "Always consult a veterinarian about your pet's health, and contact one immediately in an emergency. You are responsible for the care decisions you make for your pet.",
      ],
    },
    {
      heading: "5. Third-party veterinary services",
      body: [
        "The Service may list veterinary clinics or let you contact or book third-party providers. Those providers are independent of Kagu Software. We do not provide veterinary services, and we are not a party to — or responsible for — any service, appointment, or transaction between you and a provider.",
      ],
    },
    {
      heading: "6. Subscriptions (PetPal+)",
      body: [
        "Parts of the Service require a paid subscription (“PetPal+”). Subscriptions are purchased through the Apple App Store or Google Play and renew automatically until cancelled.",
        "• Prices are shown before you purchase and may vary by region.",
        "• You can cancel any time in your App Store or Google Play subscription settings; cancellation takes effect at the end of the current billing period.",
        "• Refunds are handled by Apple or Google under their store policies. Nothing in these Terms limits any statutory refund rights you have as a consumer.",
        "We may change subscription features or pricing; changes to pricing apply only from your next renewal and only after notice through the Service or the store.",
      ],
    },
    {
      heading: "7. Coins and virtual items",
      body: [
        "The Service includes virtual coins and cosmetic items. Coins and virtual items are a limited, revocable, non-transferable license to use features within the Service. They are not money, have no cash value, cannot be exchanged outside the Service, and — except where the law requires otherwise — are non-refundable.",
        "We may adjust how coins are earned, priced, or spent to keep the Service balanced. Coins and virtual items are lost when your account is deleted.",
      ],
    },
    {
      heading: "8. Acceptable use",
      body: [
        "You agree not to:",
        "• use the Service for anything unlawful, or in a way that harms animals or people;",
        "• access another household's or user's data without permission;",
        "• interfere with, overload, reverse engineer, or disrupt the Service or its security;",
        "• upload content that is illegal, infringing, or abusive.",
        "We may suspend or terminate accounts that violate these Terms.",
      ],
    },
    {
      heading: "9. Our intellectual property",
      body: [
        "The Service — including its software, design, pixel art, logos, and content we provide — belongs to Kagu Software or its licensors and is protected by law. These Terms do not grant you any rights to it beyond the personal, non-commercial use of the app.",
      ],
    },
    {
      heading: "10. Availability and changes",
      body: [
        "We work to keep the Service available and improving, but it is provided “as is” and “as available”. Features may change, be added, or be removed over time, and the Service may be temporarily unavailable for maintenance or reasons outside our control.",
      ],
    },
    {
      heading: "11. Termination",
      body: [
        "You can stop using the Service and delete your account at any time in Settings › Account. We may suspend or terminate your access if you materially breach these Terms, if we are required to by law, or if we discontinue the Service — in which case we will give reasonable notice where possible.",
      ],
    },
    {
      heading: "12. Disclaimer and limitation of liability",
      body: [
        "To the maximum extent permitted by law, Kagu Software is not liable for indirect, incidental, or consequential damages, or for loss of data, arising from your use of the Service; and our total liability for claims relating to the Service is limited to the amount you paid us in the 12 months before the claim.",
        "Nothing in these Terms excludes or limits liability that cannot be excluded under applicable law, including mandatory consumer-protection rights.",
      ],
    },
    {
      heading: "13. Governing law",
      body: [
        "These Terms are governed by the laws of the Republic of Türkiye, and the courts and enforcement offices of Türkiye have jurisdiction over disputes arising from them. If you live elsewhere, you keep any protection granted by mandatory consumer laws of your country of residence.",
      ],
    },
    {
      heading: "14. Changes to these Terms",
      body: [
        "We may update these Terms from time to time. For material changes we will give notice in the app before the new Terms take effect. Continuing to use the Service after that date means you accept the updated Terms.",
      ],
    },
    {
      heading: "15. Contact",
      body: [
        `Questions about these Terms? Contact Kagu Software at ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};

const termsTr: LegalDoc = {
  title: "Kullanım Koşulları",
  updated: "Son güncelleme: 31 Temmuz 2026",
  intro: [
    "Bu Kullanım Koşulları (“Koşullar”), Kagu Software (“Kagu Software”, “biz”) tarafından sunulan PetPal mobil uygulaması ve ilgili hizmetlerin (birlikte “Hizmet”) kullanımını düzenler. Hesap oluşturarak veya Hizmeti kullanarak bu Koşulları kabul etmiş olursunuz. Kabul etmiyorsanız lütfen Hizmeti kullanmayın.",
    "Bu Koşullar İngilizce yazılmış olup kolaylık açısından Türkçe olarak da sunulmaktadır. İki sürüm arasında çelişki olması halinde, yürürlükteki hukukun izin verdiği ölçüde İngilizce sürüm geçerlidir.",
  ],
  sections: [
    {
      heading: "1. PetPal'ı kimler kullanabilir",
      body: [
        "Hesap oluşturmak için en az 13 yaşında olmanız gerekir. Ülkenizin hukukuna göre çevrim içi hizmetlere rıza gösterme yaşının altındaysanız, Hizmeti bir ebeveyn veya yasal vasinin kurması ve gözetiminde kullanmanız gerekir.",
        "Sağladığınız bilgilerin doğruluğundan ve giriş bilgilerinizin güvenliğinden siz sorumlusunuz. Hesabınıza izinsiz erişildiğini düşünüyorsanız lütfen hemen bize bildirin.",
      ],
    },
    {
      heading: "2. Aileler (haneler) ve paylaşılan veriler",
      body: [
        "PetPal aileler için tasarlanmıştır. Bir haneye katıldığınızda, o hanedeki içerik — evcil hayvanlar, bakım kayıtları, hatırlatıcılar, sağlık kayıtları ve benzeri veriler — her üyenin rolüne göre (sahip, yönetici veya üye) diğer hane üyeleriyle paylaşılır.",
        "Yalnızca güvendiğiniz kişileri davet edin. Bir haneden ayrılırsanız, katkıda bulunduğunuz veriler hanenin ortak geçmişinin bir parçası olarak kalabilir.",
      ],
    },
    {
      heading: "3. İçeriğiniz",
      body: [
        "Hizmete eklediğiniz içeriğin (örneğin evcil hayvan profilleri, notlar ve kayıtlar) sahibi siz olmaya devam edersiniz. Hizmetin çalışabilmesi için bu içeriği barındırma, saklama, görüntüleme ve senkronize etme — yukarıda açıklandığı şekilde hanenizle paylaşma dahil — amacıyla gereken sınırlı lisansı bize vermiş olursunuz. İçeriğinizi reklam için kullanmayız ve satmayız.",
      ],
    },
    {
      heading: "4. PetPal veteriner tavsiyesi değildir",
      body: [
        "Hizmetteki bakım rehberleri, planlar, hatırlatıcılar, içgörüler ve diğer evcil hayvan bakım içerikleri yalnızca genel bilgilendirme amacıyla sunulur. Bunlar veteriner tavsiyesi, teşhisi veya tedavisi değildir ve uzman bir veteriner hekimin yerini tutmaz.",
        "Evcil hayvanınızın sağlığıyla ilgili her zaman bir veteriner hekime danışın; acil durumlarda derhal bir veterinere başvurun. Evcil hayvanınız için aldığınız bakım kararlarından siz sorumlusunuz.",
      ],
    },
    {
      heading: "5. Üçüncü taraf veterinerlik hizmetleri",
      body: [
        "Hizmet, veteriner klinikleri listeleyebilir veya üçüncü taraf sağlayıcılarla iletişim kurmanıza ya da randevu almanıza olanak tanıyabilir. Bu sağlayıcılar Kagu Software'den bağımsızdır. Biz veterinerlik hizmeti sunmayız; sizinle bir sağlayıcı arasındaki hiçbir hizmetin, randevunun veya işlemin tarafı değiliz ve bunlardan sorumlu değiliz.",
      ],
    },
    {
      heading: "6. Abonelikler (PetPal+)",
      body: [
        "Hizmetin bazı bölümleri ücretli abonelik (“PetPal+”) gerektirir. Abonelikler Apple App Store veya Google Play üzerinden satın alınır ve iptal edilene kadar otomatik olarak yenilenir.",
        "• Fiyatlar satın almadan önce gösterilir ve bölgeye göre değişebilir.",
        "• App Store veya Google Play abonelik ayarlarından istediğiniz zaman iptal edebilirsiniz; iptal, mevcut fatura döneminin sonunda geçerli olur.",
        "• İadeler, Apple veya Google tarafından kendi mağaza politikalarına göre yürütülür. Bu Koşullardaki hiçbir hüküm, tüketici olarak sahip olduğunuz yasal iade haklarını sınırlamaz.",
        "Abonelik özelliklerini veya fiyatlarını değiştirebiliriz; fiyat değişiklikleri yalnızca bir sonraki yenilemenizden itibaren ve Hizmet ya da mağaza üzerinden bildirim yapıldıktan sonra geçerli olur.",
      ],
    },
    {
      heading: "7. Coin'ler ve sanal öğeler",
      body: [
        "Hizmet, sanal coin'ler ve kozmetik öğeler içerir. Coin'ler ve sanal öğeler, Hizmet içindeki özellikleri kullanmak için verilen sınırlı, geri alınabilir ve devredilemez bir lisanstır. Para değildirler, nakit karşılıkları yoktur, Hizmet dışında takas edilemezler ve — yasaların aksini gerektirdiği durumlar hariç — iade edilemezler.",
        "Hizmetin dengesini korumak için coin'lerin nasıl kazanıldığını, fiyatlandırıldığını veya harcandığını değiştirebiliriz. Hesabınız silindiğinde coin'ler ve sanal öğeler kaybolur.",
      ],
    },
    {
      heading: "8. Kabul edilebilir kullanım",
      body: [
        "Aşağıdakileri yapmamayı kabul edersiniz:",
        "• Hizmeti hukuka aykırı bir amaçla veya hayvanlara ya da insanlara zarar verecek şekilde kullanmak;",
        "• başka bir hanenin veya kullanıcının verilerine izinsiz erişmek;",
        "• Hizmete veya güvenliğine müdahale etmek, aşırı yük bindirmek, tersine mühendislik yapmak veya işleyişini bozmak;",
        "• yasa dışı, hak ihlali içeren veya kötüye kullanım niteliğinde içerik yüklemek.",
        "Bu Koşulları ihlal eden hesapları askıya alabilir veya kapatabiliriz.",
      ],
    },
    {
      heading: "9. Fikri mülkiyetimiz",
      body: [
        "Hizmet — yazılımı, tasarımı, piksel sanatı, logoları ve bizim sunduğumuz içerik dahil — Kagu Software'e veya lisans verenlerine aittir ve yasalarla korunur. Bu Koşullar size, uygulamanın kişisel ve ticari olmayan kullanımı dışında herhangi bir hak vermez.",
      ],
    },
    {
      heading: "10. Erişilebilirlik ve değişiklikler",
      body: [
        "Hizmeti erişilebilir tutmak ve geliştirmek için çalışıyoruz; ancak Hizmet “olduğu gibi” ve “mevcut olduğu şekliyle” sunulur. Özellikler zamanla değişebilir, eklenebilir veya kaldırılabilir; Hizmet, bakım veya kontrolümüz dışındaki nedenlerle geçici olarak kullanılamayabilir.",
      ],
    },
    {
      heading: "11. Fesih",
      body: [
        "Hizmeti kullanmayı istediğiniz zaman bırakabilir ve Ayarlar › Hesap bölümünden hesabınızı silebilirsiniz. Bu Koşulları esaslı şekilde ihlal etmeniz, yasal bir zorunluluk doğması veya Hizmeti sonlandırmamız halinde erişiminizi askıya alabilir veya sonlandırabiliriz — mümkün olan durumlarda makul bir bildirim yaparız.",
      ],
    },
    {
      heading: "12. Sorumluluk reddi ve sorumluluğun sınırlandırılması",
      body: [
        "Yasaların izin verdiği azami ölçüde, Kagu Software, Hizmeti kullanımınızdan kaynaklanan dolaylı, arızi veya netice kabilinden zararlardan ya da veri kaybından sorumlu değildir; Hizmetle ilgili taleplere ilişkin toplam sorumluluğumuz, talepten önceki 12 ay içinde bize ödediğiniz tutarla sınırlıdır.",
        "Bu Koşullardaki hiçbir hüküm, zorunlu tüketici koruma hakları dahil olmak üzere, yürürlükteki hukuka göre hariç tutulamayacak sorumlulukları hariç tutmaz veya sınırlamaz.",
      ],
    },
    {
      heading: "13. Uygulanacak hukuk",
      body: [
        "Bu Koşullar Türkiye Cumhuriyeti hukukuna tabidir ve bu Koşullardan doğan uyuşmazlıklarda Türkiye mahkemeleri ve icra daireleri yetkilidir. Başka bir ülkede yaşıyorsanız, ikamet ettiğiniz ülkenin emredici tüketici hukukunun sağladığı korumalar saklıdır.",
      ],
    },
    {
      heading: "14. Koşullardaki değişiklikler",
      body: [
        "Bu Koşulları zaman zaman güncelleyebiliriz. Önemli değişikliklerde, yeni Koşullar yürürlüğe girmeden önce uygulama içinde bildirim yaparız. Bu tarihten sonra Hizmeti kullanmaya devam etmeniz, güncellenmiş Koşulları kabul ettiğiniz anlamına gelir.",
      ],
    },
    {
      heading: "15. İletişim",
      body: [
        `Bu Koşullarla ilgili sorularınız için Kagu Software ile ${LEGAL_CONTACT_EMAIL} adresinden iletişime geçebilirsiniz.`,
      ],
    },
  ],
};

const privacyEn: LegalDoc = {
  title: "Privacy Policy",
  updated: "Last updated: July 31, 2026",
  intro: [
    "This Privacy Policy explains what personal data Kagu Software (“we”, “us”) collects when you use the PetPal app, how we use it, and the choices you have. We keep it simple: we collect what the app needs to work, we don't run ads or analytics trackers, and we never sell your data.",
    "This Policy is written in English and also provided in Turkish for convenience. If the two versions conflict, the English version controls to the extent permitted by applicable law.",
  ],
  sections: [
    {
      heading: "1. Data we collect",
      body: [
        "• Account data: your name, email address, and password (stored as a secure hash), or your Apple / Google sign-in identity if you use those.",
        "• Pet and care data you add: pet profiles, care logs, reminders, schedules, weights, medications, vaccinations, vet visits, supplies, and notes.",
        "• Household data: which households you belong to, your role, and invites you create or redeem.",
        "• Purchase status: whether you have PetPal+ and which in-app purchases you made — handled by Apple/Google and RevenueCat; we never see your card details.",
        "• App data: a push-notification token if you enable notifications, your in-app preferences (units, appearance, accessibility), and coins/streak progress.",
        "• Support: anything you send us when you email support.",
        "We do not collect your precise location, contacts, or advertising identifiers, and the app contains no ads, analytics, or tracking SDKs.",
      ],
    },
    {
      heading: "2. How we use your data",
      body: [
        "• To provide the Service: storing your data, syncing it live across your devices and your household's devices, and sending the reminders and notifications you set up.",
        "• To handle sign-in, security, and account recovery.",
        "• To activate purchases and subscriptions you make.",
        "• To answer your support requests.",
        "• To comply with legal obligations.",
        "We do not use your data for advertising or profiling, and we do not sell it to anyone.",
      ],
    },
    {
      heading: "3. Who your data is shared with",
      body: [
        "• Your household: pets and care data in a household are visible to its members — that sharing is the point of the app.",
        "• Supabase: our backend platform, which hosts the database and authentication (data is stored on its cloud infrastructure).",
        "• RevenueCat: processes subscription and purchase status. Payment itself is handled by Apple or Google.",
        "• Apple and Google: if you sign in with them, and for all payments made through their stores.",
        "• Expo: delivers push notifications if you enable them.",
        "These providers process data only to run the Service for us. We may also disclose data if the law requires it.",
      ],
    },
    {
      heading: "4. International transfers",
      body: [
        "Our backend runs on cloud infrastructure that may be located outside Türkiye or your country of residence. Where data is transferred abroad, we rely on our providers' contractual safeguards and comply with applicable data-protection law, including Turkish Law No. 6698 (KVKK).",
      ],
    },
    {
      heading: "5. How long we keep data",
      body: [
        "We keep your data while your account exists. When you delete your account (Settings › Account), your account and personal data are deleted. Care records you contributed to a shared household may remain part of that household's history for its other members. Backup copies are purged on a rolling basis.",
      ],
    },
    {
      heading: "6. Security",
      body: [
        "Data is encrypted in transit, access to the database is restricted by row-level security rules (each household can only reach its own data), and passwords are stored only as secure hashes. No system is perfectly secure, but we design for least access.",
      ],
    },
    {
      heading: "7. Your rights",
      body: [
        "Under KVKK and other applicable data-protection laws (such as the GDPR where it applies), you have the right to know whether we process your data, to request access, correction, or deletion, to object to processing, and to lodge a complaint with your supervisory authority (in Türkiye, the KVKK Board).",
        `You can exercise most of these directly in the app — edit your data anywhere, delete your account in Settings › Account — or by writing to ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      heading: "8. Children",
      body: [
        "PetPal accounts require users to be at least 13 years old. We do not knowingly collect data from children below that age; if you believe a child has created an account, contact us and we will delete it.",
      ],
    },
    {
      heading: "9. Changes to this Policy",
      body: [
        "We may update this Policy from time to time. For material changes we will give notice in the app. The “Last updated” date above always shows the current version.",
      ],
    },
    {
      heading: "10. Contact",
      body: [
        `Data controller: Kagu Software. For any privacy question or request, contact ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};

const privacyTr: LegalDoc = {
  title: "Gizlilik Politikası",
  updated: "Son güncelleme: 31 Temmuz 2026",
  intro: [
    "Bu Gizlilik Politikası, PetPal uygulamasını kullandığınızda Kagu Software'in (“biz”) hangi kişisel verileri topladığını, bunları nasıl kullandığını ve sahip olduğunuz seçenekleri açıklar. Yaklaşımımız basit: yalnızca uygulamanın çalışması için gerekenleri toplarız, reklam veya analiz izleyicileri kullanmayız ve verilerinizi asla satmayız.",
    "Bu Politika İngilizce yazılmış olup kolaylık açısından Türkçe olarak da sunulmaktadır. İki sürüm arasında çelişki olması halinde, yürürlükteki hukukun izin verdiği ölçüde İngilizce sürüm geçerlidir.",
  ],
  sections: [
    {
      heading: "1. Topladığımız veriler",
      body: [
        "• Hesap verileri: adınız, e-posta adresiniz ve parolanız (güvenli özet/hash olarak saklanır) veya kullanıyorsanız Apple / Google giriş kimliğiniz.",
        "• Eklediğiniz evcil hayvan ve bakım verileri: evcil hayvan profilleri, bakım kayıtları, hatırlatıcılar, programlar, kilo takibi, ilaçlar, aşılar, veteriner ziyaretleri, malzemeler ve notlar.",
        "• Hane verileri: hangi hanelere üye olduğunuz, rolünüz ve oluşturduğunuz veya kullandığınız davetler.",
        "• Satın alma durumu: PetPal+ aboneliğinizin olup olmadığı ve hangi uygulama içi satın almaları yaptığınız — Apple/Google ve RevenueCat tarafından yürütülür; kart bilgilerinizi hiçbir zaman görmeyiz.",
        "• Uygulama verileri: bildirimleri açarsanız bir anlık bildirim jetonu, uygulama içi tercihleriniz (birimler, görünüm, erişilebilirlik) ve coin/seri ilerlemeniz.",
        "• Destek: destek e-postası gönderdiğinizde bize ilettiğiniz her şey.",
        "Hassas konumunuzu, kişilerinizi veya reklam tanımlayıcılarınızı toplamayız; uygulamada reklam, analiz veya izleme SDK'sı bulunmaz.",
      ],
    },
    {
      heading: "2. Verilerinizi nasıl kullanıyoruz",
      body: [
        "• Hizmeti sunmak için: verilerinizi saklamak, cihazlarınız ve hanenizin cihazları arasında canlı senkronize etmek ve ayarladığınız hatırlatıcı ve bildirimleri göndermek.",
        "• Giriş, güvenlik ve hesap kurtarma işlemlerini yürütmek için.",
        "• Yaptığınız satın alma ve abonelikleri etkinleştirmek için.",
        "• Destek taleplerinizi yanıtlamak için.",
        "• Yasal yükümlülüklere uymak için.",
        "Verilerinizi reklam veya profilleme için kullanmayız ve kimseye satmayız.",
      ],
    },
    {
      heading: "3. Verileriniz kimlerle paylaşılır",
      body: [
        "• Haneniz: bir hanedeki evcil hayvan ve bakım verileri, hane üyeleri tarafından görülebilir — uygulamanın amacı da bu paylaşımdır.",
        "• Supabase: veritabanı ve kimlik doğrulamayı barındıran arka uç platformumuz (veriler onun bulut altyapısında saklanır).",
        "• RevenueCat: abonelik ve satın alma durumunu işler. Ödemenin kendisi Apple veya Google tarafından gerçekleştirilir.",
        "• Apple ve Google: onlarla giriş yaparsanız ve mağazaları üzerinden yapılan tüm ödemelerde.",
        "• Expo: bildirimleri açarsanız anlık bildirimleri iletir.",
        "Bu sağlayıcılar verileri yalnızca Hizmeti bizim adımıza çalıştırmak için işler. Yasaların gerektirmesi halinde de veri açıklayabiliriz.",
      ],
    },
    {
      heading: "4. Yurt dışına veri aktarımı",
      body: [
        "Arka uç sistemlerimiz, Türkiye'nin veya ikamet ettiğiniz ülkenin dışında bulunabilen bulut altyapısı üzerinde çalışır. Verilerin yurt dışına aktarıldığı durumlarda, sağlayıcılarımızın sözleşmesel güvencelerine dayanır ve 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) dahil yürürlükteki veri koruma hukukuna uyarız.",
      ],
    },
    {
      heading: "5. Verileri ne kadar saklarız",
      body: [
        "Verilerinizi hesabınız var olduğu sürece saklarız. Hesabınızı sildiğinizde (Ayarlar › Hesap), hesabınız ve kişisel verileriniz silinir. Ortak bir haneye katkıda bulunduğunuz bakım kayıtları, diğer üyeler için o hanenin geçmişinin bir parçası olarak kalabilir. Yedek kopyalar belirli aralıklarla temizlenir.",
      ],
    },
    {
      heading: "6. Güvenlik",
      body: [
        "Veriler aktarım sırasında şifrelenir; veritabanına erişim, satır düzeyi güvenlik kurallarıyla sınırlandırılmıştır (her hane yalnızca kendi verilerine erişebilir) ve parolalar yalnızca güvenli özet (hash) olarak saklanır. Hiçbir sistem kusursuz güvenli değildir; ancak sistemlerimizi en az erişim ilkesiyle tasarlıyoruz.",
      ],
    },
    {
      heading: "7. Haklarınız",
      body: [
        "KVKK ve yürürlükteki diğer veri koruma yasaları (uygulandığı ölçüde GDPR dahil) kapsamında; verilerinizin işlenip işlenmediğini öğrenme, erişim, düzeltme veya silme talep etme, işlemeye itiraz etme ve denetleyici kuruma (Türkiye'de KVKK Kurulu) şikayette bulunma hakkına sahipsiniz.",
        `Bu hakların çoğunu doğrudan uygulama içinde kullanabilirsiniz — verilerinizi her yerden düzenleyebilir, hesabınızı Ayarlar › Hesap bölümünden silebilirsiniz — veya ${LEGAL_CONTACT_EMAIL} adresine yazabilirsiniz.`,
      ],
    },
    {
      heading: "8. Çocuklar",
      body: [
        "PetPal hesapları için kullanıcıların en az 13 yaşında olması gerekir. Bu yaşın altındaki çocuklardan bilerek veri toplamayız; bir çocuğun hesap oluşturduğunu düşünüyorsanız bize ulaşın, hesabı sileriz.",
      ],
    },
    {
      heading: "9. Politikadaki değişiklikler",
      body: [
        "Bu Politikayı zaman zaman güncelleyebiliriz. Önemli değişikliklerde uygulama içinde bildirim yaparız. Yukarıdaki “Son güncelleme” tarihi her zaman geçerli sürümü gösterir.",
      ],
    },
    {
      heading: "10. İletişim",
      body: [
        `Veri sorumlusu: Kagu Software. Gizlilikle ilgili her türlü soru ve talebiniz için ${LEGAL_CONTACT_EMAIL} adresine yazabilirsiniz.`,
      ],
    },
  ],
};

export const LEGAL_DOCS: Record<LegalDocId, Record<LegalLang, LegalDoc>> = {
  terms: { en: termsEn, tr: termsTr },
  privacy: { en: privacyEn, tr: privacyTr },
};

export function isLegalDocId(v: string | undefined): v is LegalDocId {
  return v === "terms" || v === "privacy";
}
