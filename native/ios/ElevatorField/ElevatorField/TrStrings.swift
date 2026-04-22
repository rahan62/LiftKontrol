import Foundation

/// Web `src/lib/i18n/tr.ts` ile aynı metinler — değişince her iki yeri güncelleyin.
enum TrStrings {
  enum Brand {
    static let appName = "Lift Kontrol"
  }

  enum Auth {
    static let signOut = "Çıkış"
    static let signIn = "Giriş yap"
    static let signingIn = "Giriş yapılıyor…"
    static let signInFailed = "Giriş başarısız"
    static let email = "E-posta"
    static let password = "Şifre"
    static let tagline = "Asansör bakımı ve saha servisi"
    static let noPublicSignup = "Erişim şirketiniz veya tedarikçiniz tarafından verilir; herkese açık kayıt yoktur."
    static let aboutSignup = "Kayıt hakkında"
    static let landingOnlyOnWeb = "Tanıtım ana sayfası yalnızca web üzerindedir; bu uygulama giriş sonrası panele yönlendirir."
    static let membersOnlyFooter = "Yalnızca üyeler kullanabilir"
  }

  enum Signup {
    static let title = "Erişim şirketiniz tarafından verilir"
    static let intro =
      "Bu uygulama yalnızca asansör servis şirketleri içindir. Herkese açık kayıt sunmuyoruz. Organizasyonunuz ürünü satın aldığında sizin için bir yönetici hesabı oluşturulur; yönetici çalışanları şirket çalışma alanına ekler."
    static let customersNote =
      "Hizmet verdiğiniz bina ve tesis yöneticileri uygulama içinde «Müşteriler» bölümünde görünür; ürünün ayrı bir kiracısı değildirler."
  }

  enum Common {
    static let loading = "Yükleniyor…"
    static let cancel = "İptal"
    static let edit = "Düzenle"
    static let paid = "Ödendi"
    static let unpaid = "Ödenmedi"
    static let ok = "Tamam"
    static let delete = "Sil"
    static let errorTitle = "Hata"
  }

  enum Layout {
    static let menuSection = "Menü"
    static let openMenu = "Menüyü aç"
    static let otherSection = "Diğer"
    static let detailFormsSection = "Detay / formlar"
    static let sessionSection = "Oturum"
    static let awaitingTenant = "Şirket erişimi bekleniyor"
    static let qrScanTitle = "Asansör QR okut"
    static let qrScanPasteHint = "Bağlantıyı buraya yapıştırabilirsiniz."
    static let qrScanInvalid = "Bu metin geçerli bir asansör bağlantısı değil (/app/assets/…)."
    static let qrScanOpenPasted = "Asansöre git"
  }

  enum Tabs {
    static let dashboard = "Panel"
    static let program = "Program"
    static let sites = "Sahalar"
    static let assets = "Asansörler"
    static let menu = "Menü"
    static let qrScan = "QR okut"
  }

  enum Dashboard {
    static let title = "Yönetim paneli"
    static let subtitle = "Servis şirketiniz için özet göstergeler. Dağıtım, saha ve depo görünümleri aşağıda."
    static let portfolio = "Portföy"
    static let customers = "Müşteriler"
    static let contracts = "Aktif sözleşmeler"
    static let elevators = "Asansör üniteleri"
    static let workOrders = "İş emirleri (tümü)"
    static let risk = "Risk ve kuyruk"
    static let openBreakdowns = "Açık arızalar"
    static let callbacks = "Geri aramalar"
    static let tenantScopeNote =
      "Özet, hesabınızdaki ilk şirket üyeliğine göre gösterilir (web oturumu tek kiracı seçer)."
    static let upcomingPeriodic = "Yaklaşan periyodik kontroller"
    static let upcomingPeriodicHint =
      "Sonraki kontrol tarihi 20 gün içinde olan asansörler (en8120_next_control_due)."
    static let daysLeft = "gün kaldı"
    static let openModuleHint = "İlgili modülü açar"
  }

  enum Assets {
    static let unit = "Ünite"
    static let site = "Saha / bina"
    static let customerParty = "Müşteri"
    static let customerName = "Ad"
    static let listTitle = "Asansörler"
    static let listDescription =
      "Her asansör benzersiz bir kayıt ve QR ile web uygulamasındaki detay sayfasına bağlanır; saha ile ilişkilidir."
    static let empty = "Henüz asansör yok. Saha altından veya buradan ekleyin."
    static let newTitle = "Yeni asansör"
    static let editTitle = "Asansörü düzenle"
    static let addPrereq = "Önce müşteri ve saha oluşturun."
    static let unitCodeLabel = "Ünite kodu *"
    static let elevatorType = "Asansör tipi"
    static let brand = "Marka"
    static let model = "Model"
    static let serial = "Seri no"
    static let uniqueId = "Benzersiz kimlik"
    static let brandModel = "Marka / model"
    static let status = "Durum"
    static let flags = "Bayraklar"
    static let unsafe = "Güvensiz"
    static let unsafeToggle = "Güvensiz işareti"
    static let open = "Aç"
    static let detailHint = "Teknik alanlar ve EN 81-20 web uygulamasında."
    static let idLabel = "Kimlik (UUID)"
    static let idHint = "Veritabanı birincil anahtarı (UUID)."
    static let qrTitle = "QR kod"
    static let qrHint =
      "Her asansörün bir QR kodu vardır; kayıt sonrası bağlantı veritabanına yazılır. Mobilde de tam URL için Local.xcconfig içinde PUBLIC_APP_URL (web’deki NEXT_PUBLIC_APP_URL ile aynı) tanımlayın."
    static let specsSection = "Teknik özellikler"
    static let stops = "Durak sayısı"
    static let capacityKg = "Kapasite (kg)"
    static let persons = "Kişi sayısı"
    static let speed = "Hız (m/s)"
    static let controller = "Kumanda"
    static let drive = "Tahrik"
    static let door = "Kapı"
    static let commissionedAt = "Devreye alma"
    static let takeoverAt = "Devralma"
    static let operationalStatus = "Çalışma durumu"
    static let financeSection = "Finans (bu asansör)"
    static let goToSite = "Sahayı aç"
    static let workOrdersSection = "İş emirleri (arıza / servis)"
    static let workOrdersEmpty = "Bu ünite için iş emri yok."
    static let newBreakdownWorkOrder = "Yeni arıza / iş emri"
    static let partsSection = "Parça kullanımı"
    static let partsSectionHint = "Değişen parçalar ve miktarlar. Mobil veya web’den kayıt girebilirsiniz."
    static let recordPartsUsage = "Parça kullanımı kaydet"
    static let viewPartsForAsset = "Bu ünitenin parça geçmişi"
    static let maintenanceFeeSection = "Dönemlik bakım ücreti"
    static let maintenanceFeeHint =
      "«Aylık» seçildiğinde, ilgili ayın aylık bakımı tamamlanınca finansa otomatik borç satırı eklenebilir."
    static let maintenanceFeeAmount = "Ücret tutarı"
    static let feePeriodLabel = "Ücret dönemi"
    static let periodNone = "—"
    static let periodMonthly = "Aylık"
    static let periodYearly = "Yıllık"
    static let periodYearlyNote = "Yıllık ücret için otomatik finans satırı oluşturulmaz."
    static let feeNeedsPeriod = "Ücret tutarı girdiyse dönem olarak aylık veya yıllık seçin."
  }

  enum Finances {
    static let listTitle = "Finans"
    static let noEntries = "Henüz finans kaydı yok."

    static func entryTypeLabel(_ raw: String) -> String {
      switch raw {
      case "invoice": return "Fatura"
      case "payment": return "Ödeme"
      case "credit_note": return "İade / düzeltme"
      case "fee": return "Ücret"
      case "adjustment": return "Düzeltme"
      case "other": return "Diğer"
      default: return raw.replacingOccurrences(of: "_", with: " ")
      }
    }

    static let date = "Tarih"
    static let type = "Tür"
    static let descriptionCol = "Açıklama"
    static let amount = "Tutar"
    static let payment = "Ödeme"
    static let noEntriesAsset = "Bu ünite için henüz finans kaydı yok."
  }

  enum En8120 {
    static let sectionTitle = "EN 81-20 ve bakım devri"
    static let controlAuthority = "Periyodik kontrol yetkisi"
    static let privateCompanyName = "Özel kontrol kuruluşu adı"
    static let nextControlDue = "Sonraki kontrol tarihi (plan)"
    static let planDateToggle = "Sonraki periyodik kontrol tarihi belirlensin"
    static let nextControlDueHint =
      "Takvimden seçin (gg.aa.yyyy). Kayıt sunucuya yalnızca geçerli takvim günü olarak (yyyy-aa-gg) gider."
    static let transferBasis = "Bakım devri şekli"
    static let invalidDate =
      "Tarih geçersiz veya aralık dışı. Takvimi kullanın veya yyyy-aa-gg / gg.aa.yyyy formatında girin."
  }

  enum Module {
    static let placeholderDescription =
      "Bu modül yalnızca native uygulamada tamamlanacak; tarayıcı veya gömülü web görünümü kullanılmaz. Veriler aynı hesap ile sunucuda."
    static let webRoutePrefix = "Panel rotası (web ile aynı yol):"
  }

  enum ConfigHints {
    static let postgresUrlHint = """
    SUPABASE_URL, HTTPS proje adresi olmalıdır (ör. https://REF.supabase.co, \
    Pano → Ayarlar → API). Postgres DATABASE_URL (postgresql://…) buraya yapıştırmayın.
    Local.xcconfig dosyasını düzeltin, ardından Ürün → Temizle (⇧⌘K) ve yeniden çalıştırın.
    """

    static let genericHint = """
    Supabase’i Xcode yapı ayarlarında (xcconfig) tanımlayın.

    1. ElevatorField/Config/Local.example.xcconfig → Local.xcconfig kopyalayın
    2. SUPABASE_URL için HTTPS API adresi (postgresql:// değil), SUPABASE_ANON_KEY için anon anahtar girin.
    3. (İsteğe bağlı) PUBLIC_APP_URL: web panel adresi; mobilde oluşturulan asansörlerin QR metni için.

    Ayrıntı: native/README.md
    """
  }

  enum Membership {
    static let loadFailed = "Üyelikler yüklenemedi"
    static let noAccessTitle = "Şirket erişimi yok"
    static let noAccessBody = "tenant_members satırı yok veya RLS engelledi."
    static let sectionTitle = "Üyelikler"
  }

  enum Onboarding {
    static let title = "Henüz şirket erişimi yok"
    static let body =
      "Hesabınızla giriş yaptınız, ancak bu sistemde bir asansör servis şirketine bağlı değilsiniz. Erişim, organizasyonunuz tarafından bizimle kurulduğunda veya bir şirket yöneticisinin sizi davet edip rol atamasıyla verilir."
    static let hint = "Bunun bir hata olduğunu düşünüyorsanız şirket yöneticinize veya hesap temsilcinize başvurun."
    static let returnHome = "Ana sayfaya dön"
    static let signOutViaMenu = "Çıkış yapmak için alttaki «Menü» sekmesini açıp listenin en altındaki «Çıkış»a dokunun."
  }

  enum Customers {
    static let title = "Müşteriler"
    static let empty = "Henüz müşteri yok. «Yeni müşteri» ile ekleyin."
    static let newTitle = "Yeni müşteri"
    static let legalNameRequired = "Hukuki ad zorunludur"
    static let legalNameLabel = "Hukuki ad *"
    static let codeLabel = "Hesap kodu"
    static let statusLabel = "Durum"
    static let notesLabel = "Notlar"
    static let billingSection = "Fatura adresi"
    static let addrLine1 = "Satır 1"
    static let addrCity = "İlçe / şehir"
    static let addrRegion = "İl / bölge"
    static let addrPostal = "Posta kodu"
    static let addrCountry = "Ülke"
    static let save = "Kaydet"
    static let saving = "Kaydediliyor…"
    static let backToList = "Listeye dön"
    static let detailHint = "Özet: faturalama, notlar. Diğer sekmeler web uygulamasında."
    static let billingCard = "Faturalama"
    static let notesCard = "Notlar"
    static let rootCausePrefix = "Kök neden:"
  }

  enum Schedule {
    static let title = "Program / Rota"
    static let viewMonthly = "Aylık"
    static let viewDaily = "Günlük"
    static let dailyTodayPlan = "Bugünün sevk planı"
    static let dailyEmpty = "Bu gün için günlük sevk yok (sunucu cron / DATABASE_URL)."
    static let clustersTitle = "Bakım kümeleri"
    static let clustersEmpty = "Küme verisi yok — web’den program üretin veya bir süre bekleyin."
    static let clustersRadiusFmt = "Harita yarıçapı (kayıtlı): %.1f km"
    static let clustersMaxUnitsFmt = "Küme başına en fazla: %d ünite"
    static let clustersRefresh = "Kümeleri yenile"
    static let clustersUpdated = "Güncellendi"
    static let clusterIndex = "Küme"
    static let crew = "Saha ekibi"
    static let noCrews = "Ofiste web’den saha ekibi oluşturulmalı."
    static let noPlan = "Bu ay için bakım rotası yok. Ofiste «Program / Sevkiyat» üzerinden üretin."
    static let blockingSection = "Açık arıza (program bekliyor)"
    static let openInMaps = "Apple Haritalar’da sırayla aç"
    static let periodicSection = "Periyodik kontrol (tarih planı)"
    static let periodicBadge = "EN 81-20"
    static let emptyMonth = "Bu ay için rota durağı veya planlı periyodik kontrol tarihi yok."
    static let periodicNoRouteStops = "Bu gün için bakım rotası durağı yok (yalnızca periyodik kontrol planı)."
  }

  enum Maintenance {
    static let title = "Aylık bakım takibi"
    static let description =
      "Sözleşmeli aylık bakımda her üniteyi ziyaret edilir; ray, kapı, motor yağı, fren ve tampon kontrolleri kayda geçer."
    static let prevMonth = "Önceki ay"
    static let nextMonth = "Sonraki ay"
    static let done = "Tamamlandı"
    static let pending = "Bekliyor"
    static let completedAt = "Tamamlanma"
    static let loadFailed = "Bakım listesi yüklenemedi"
    static let noTenant = "Şirket bağlamı yok"
    static let markCompleteSwipe = "Tamamlandı"
    static let unmarkSwipe = "İşareti kaldır"
    static let assetSectionTitle = "Bu ayın bakımı (takvim ayı)"
    static let assetMarkComplete = "Bu ayın bakımını tamamlandı işaretle"
    static let assetUnmark = "Tamamlandı işaretini kaldır"
    static let assetMaintHint =
      "Aynı işlem «Bakım» listesinde satırı kaydırarak da yapılabilir. Checklist detayı web’dedir."
  }

  enum Sites {
    static let title = "Saha / Binalar"
    static let newTitle = "Yeni saha"
    static let empty = "Henüz saha yok. Önce müşteri ekleyin, sonra saha oluşturun."
    static let updated = "Güncellendi"
    static let detailHint = "Servis adresi, erişim ve sahaya bağlı asansörler. Dönemlik ücret her asansör kartındadır."
    static let maintenanceSection = "Saha bakım notları"
    static let maintenanceNotesHint =
      "Dönemlik bakım ücreti ve sıklığı (aylık / yıllık) asansör eklerken tanımlanır."
    static let periodicFeeOnElevators = "Ücret bilgisi her asansörün detayında."
    static let accessSection = "Erişim ve notlar"
    static let assetsOnSite = "Bu sahadaki asansörler"
    static let addCustomerFirst = "Önce müşteri ekleyin."
    static let goNewCustomer = "Yeni müşteri"
    static let serviceAddressSection = "Servis adresi"
    static let billingSameLabel = "Fatura adresi servisle aynı"
    static let machineRoom = "Makine dairesi"
    static let shaft = "Kuyu"
    static let geoMapLocation = "Harita konumu"
    static let geoFetchFromAddress = "Adresten konum getir"
    static let geoFetchBusy = "Konum aranıyor…"
    static let geoFetchOk = "Konum kaydedildi."
    static let geoFetchNoResult = "Bu adres için sonuç bulunamadı. Web’den adresi netleştirip tekrar deneyin."
    static let geoFetchNoAddress =
      "Servis adresinde en az cadde veya şehir bilgisi yok; web uygulamasından adresi tamamlayın."
    static let geoFetchHint =
      "Kayıtlı servis adresine göre konum aranır. Adres web’de güncellendiyse bu ekranı kapatıp tekrar açın."
  }

  enum Callbacks {
    static let title = "Geri aramalar"
    static let empty = "Henüz geri arama kaydı yok. Web’de iş emri zinciri oluşturulunca burada listelenir."
    static let newWoFmt = "Yeni: %@"
    static let priorWoFmt = "Önceki: %@"
    static let reason = "Kod"
    static let unit = "Ünite"
  }

  enum WorkOrders {
    static let title = "İş emirleri"
    static let empty = "Henüz iş emri yok."
    static let emergency = "Acil"
    static let fieldNumber = "No"
    static let fieldType = "Tür"
    static let fieldStatus = "Durum"
    static let fieldPriority = "Öncelik"
    static let detailFault = "Arıza / belirti"
    static let detailNotes = "Notlar"
    static let detailHint = "Atamalar, parçalar, SLA ve bağlantılar web uygulamasında."
    static let loadFailed = "İş emri yüklenemedi"
  }

  enum MobileAPI {
    static let missingPublicURL = "PUBLIC_APP_URL (web kök adresi) tanımlı değil; mobil API çağrısı yapılamıyor."
  }

  enum Contracts {
    static let title = "Sözleşmeler"
    static let empty = "Henüz sözleşme yok."
    static let noFile = "Dosya yok"
  }

  enum ContractCreate {
    static let title = "Yeni sözleşme"
    static let customerSection = "Müşteri"
    static let customerPicker = "Müşteri"
    static let titleSection = "Sözleşme"
    static let titlePlaceholder = "Başlık *"
    static let counterpartyPlaceholder = "Karşı taraf (isteğe bağlı)"
    static let datesSection = "Tarihler"
    static let startDate = "Başlangıç *"
    static let hasEndDate = "Bitiş tarihi var"
    static let endDate = "Bitiş"
    static let transferSection = "Bakım devri"
    static let transferPicker = "Şekil"
    static let transferNone = "—"
    static let transferDirect = "Önceki sözleşme bitiminden doğrudan aylık"
    static let transferAfterAnnual = "Yıllık EN 81-20 revizyonundan sonra devralma"
    static let fileSection = "Dosya (isteğe bağlı)"
    static let chooseFileOptional = "Dosya seç…"
    static let save = "Kaydet"
    static let failed = "Kayıt oluşturulamadı."
    static let doneTitle = "Sözleşme oluşturuldu"
    static let doneBody = "Listeye dönebilirsiniz."
  }

  enum Documents {
    static let title = "Belgeler"
    static let empty = "Henüz belge yok."
    static let deleteConfirm = "Bu belgeyi silmek istiyor musunuz?"
    static let uploadTitle = "Belge yükle"
    static let fieldTitle = "Başlık"
    static let fieldDescription = "Açıklama (isteğe bağlı)"
    static let fileSection = "Dosya"
    static let chooseFile = "Dosya seç…"
    static let emptyFile = "Dosya boş."
    static let uploadFailed = "Yükleme başarısız."
    static let save = "Kaydet"
  }

  enum WorkOrderCreate {
    static let title = "Yeni arıza / iş emri"
    static let assetSection = "Asansör"
    static let assetPicker = "Ünite"
    static let pickPlaceholder = "Seçin"
    static let faultSection = "Arıza / talep"
    static let faultPlaceholder = "Belirti, müşteri talebi veya not"
    static let typeSection = "Tür"
    static let emergencyBreakdown = "Acil arıza (emergency_breakdown)"
    static let markEmergency = "Acil öncelik işareti"
    static let blockingSection = "Program (isteğe bağlı)"
    static let blockingCrew = "Bloke saha ekibi"
    static let noCrew = "Yok"
    static let submit = "İş emrini oluştur"
    static let failed = "Kayıt oluşturulamadı."
    static let createdTitle = "İş emri açıldı"
    static func createdBody(_ num: String) -> String {
      "Numara: \(num)"
    }
  }

  enum PartsRecord {
    static let title = "Parça kullanımı kaydet"
    static let assetSection = "Asansör"
    static let assetPicker = "Ünite"
    static let workTypeSection = "İş türü"
    static let workType = "Çalışma tipi"
    static let workOrderSection = "İş emri"
    static let workOrderOptional = "Açık iş emri (isteğe bağlı)"
    static let noWorkOrder = "Bağlama"
    static let linesSection = "Satırlar"
    static let pickStock = "Stok kalemi seç"
    static let pickStockTitle = "Stok seç"
    static let searchStock = "SKU veya açıklama"
    static let qty = "Miktar"
    static let unitPrice = "Birim fiyat (TRY)"
    static let addLine = "Satır ekle"
    static let removeLastLine = "Son satırı kaldır"
    static let submit = "Kaydet"
    static let needsSite = "Bu ünite için saha bilgisi eksik."
    static let needLines = "En az bir geçerli satır gerekli."
    static let failed = "Kayıt başarısız."
    static let savedTitle = "Kaydedildi"
    static let savedBody = "Parça çıkışı ve finans satırı oluşturuldu."
  }
}
