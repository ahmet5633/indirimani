const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Bağlantısı
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/indirimani', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB bağlantısı başarılı');
}).catch(err => {
    console.error('MongoDB bağlantı hatası:', err);
    process.exit(1);
});

// Ürün Şeması (server.js ile aynı olmalı)
const productSchema = new mongoose.Schema({
    title: String,
    currentPrice: Number,
    originalPrice: Number,
    discount: Number,
    image: String,
    store: String,
    category: String,
    time: String,
    link: String,
    lastUpdated: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// Örnek ürün verileri
const sampleProducts = [
    {
        title: "Apple AirPods Pro 2. Nesil - Beyaz",
        currentPrice: 4999,
        originalPrice: 7999,
        discount: 38,
        image: "https://productimages.hepsiburada.net/s/189/550/110000155170656.jpg",
        store: "Hepsiburada",
        category: "elektronik",
        time: "3 saat önce",
        link: "https://www.hepsiburada.com/apple-airpods-pro-2-nesil-p-HBCV00002NU9QS"
    },
    {
        title: "Samsung Galaxy S23 Ultra 256GB - Yeşil",
        currentPrice: 39999,
        originalPrice: 49999,
        discount: 20,
        image: "https://productimages.hepsiburada.net/s/372/550/110000389833053.jpg",
        store: "Amazon",
        category: "elektronik",
        time: "5 saat önce",
        link: "https://www.amazon.com.tr/Samsung-Galaxy-S23-Ultra-Ye%C5%9Fil/dp/B0BZCSY88G/"
    },
    {
        title: "Philips Lumea IPL Epilasyon Cihazı",
        currentPrice: 7490,
        originalPrice: 12590,
        discount: 41,
        image: "https://productimages.hepsiburada.net/s/181/550/110000145698166.jpg",
        store: "Trendyol",
        category: "kozmetik",
        time: "1 gün önce",
        link: "https://www.trendyol.com/philips/lumea-advanced-sc1997-00-ipl-epilasyon-cihazi-p-32113242"
    },
    {
        title: "IKEA BILLY Kitaplık - Beyaz",
        currentPrice: 1999,
        originalPrice: 2799,
        discount: 29,
        image: "https://productimages.hepsiburada.net/s/39/550/10614057050162.jpg",
        store: "IKEA",
        category: "ev",
        time: "2 saat önce",
        link: "https://www.ikea.com.tr/urun-katalogu/calisma-alanlari/kitapliklar/29123-billy-kitaplik-beyaz"
    },
    {
        title: "Nike Air Force 1 Erkek Spor Ayakkabı",
        currentPrice: 2199,
        originalPrice: 3299,
        discount: 33,
        image: "https://productimages.hepsiburada.net/s/152/550/110000108542654.jpg",
        store: "Sportive",
        category: "giyim",
        time: "6 saat önce",
        link: "https://www.sportive.com.tr/nike-erkek-ayakkabi-cw2288-111-air-force-1-07"
    },
    {
        title: "Elidor Saç Bakım Şampuanı 650ml 3'lü Set",
        currentPrice: 249,
        originalPrice: 459,
        discount: 46,
        image: "https://productimages.hepsiburada.net/s/305/550/110000296792877.jpg",
        store: "Migros",
        category: "kozmetik",
        time: "1 gün önce",
        link: "https://www.migros.com.tr/elidor-guclu-ve-parlak-sampuan-3x650-ml-p-d1bfcf"
    },
    {
        title: "JBL Tune 510BT Kulaküstü Bluetooth Kulaklık",
        currentPrice: 999,
        originalPrice: 1799,
        discount: 45,
        image: "https://productimages.hepsiburada.net/s/88/550/110000030487168.jpg",
        store: "MediaMarkt",
        category: "elektronik",
        time: "12 saat önce",
        link: "https://www.mediamarkt.com.tr/tr/product/_jbl-tune-510-bt-wireless-kulak-üstü-kulaklık-siyah-1212392.html"
    },
    {
        title: "The Lord of the Rings Tolkien Özel Seti",
        currentPrice: 349,
        originalPrice: 499,
        discount: 30,
        image: "https://productimages.hepsiburada.net/s/8/550/9045386469426.jpg",
        store: "D&R",
        category: "kitap",
        time: "2 gün önce",
        link: "https://www.dr.com.tr/Kitap/Yuuzuklerin-Efendisi-Ozel-Kutulu-Set/J-R-R-Tolkien/Edebiyat/Roman/Fantastik/urunno=0001693172001"
    }
];

// Veritabanını temizle ve örnek verileri ekle
async function seedDatabase() {
    try {
        // Eski verileri temizle
        await Product.deleteMany({});
        console.log('Eski ürün verileri silindi');

        // Yeni verileri ekle
        const products = await Product.insertMany(sampleProducts);
        console.log(`${products.length} adet ürün başarıyla eklendi`);

        // Bağlantıyı kapat
        mongoose.connection.close();
        console.log('Veritabanı bağlantısı kapatıldı');
    } catch (error) {
        console.error('Veri ekleme hatası:', error);
        process.exit(1);
    }
}

// Seed işlemini başlat
seedDatabase(); 