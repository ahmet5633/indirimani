const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const cheerio = require('cheerio');
const { ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
        transports: ['websocket', 'polling']
    },
    allowEIO3: true,
    pingTimeout: 60000
});

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());

// MongoDB Bağlantısı
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ahmetgecgin7:DbHaijd6rNC9fsIY@ahmet.mudps.mongodb.net/indirimani?retryWrites=true&w=majority&appName=ahmet';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
}).then(() => {
    console.log('MongoDB bağlantısı başarılı');
}).catch(err => {
    console.error('MongoDB bağlantı hatası:', err);
    process.exit(1);
});

// Ürün Şeması
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

// API Endpoints
app.get('/api/products', async (req, res) => {
    try {
        let query = {};
        
        // Filtreleme
        if (req.query.category && req.query.category !== 'all') {
            query.category = req.query.category;
        }
        
        if (req.query.store && req.query.store !== 'all') {
            query.store = req.query.store;
        }
        
        // Arama
        if (req.query.search) {
            query.title = { $regex: req.query.search, $options: 'i' };
        }
        
        const products = await Product.find(query).sort({ lastUpdated: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/products/:category', async (req, res) => {
    try {
        const products = await Product.find({ category: req.params.category }).sort({ lastUpdated: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Yeni ürün ekle
app.post('/api/products', async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Ürün güncelle
app.put('/api/products/:id', async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        );
        
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }
        
        res.json(updatedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Ürün sil
app.delete('/api/products/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        
        if (!deletedProduct) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }
        
        res.json({ message: 'Ürün başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Fiyat scrape endpoint'i
app.post('/api/scrape', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ message: 'URL bilgisi gerekli' });
        }
        
        // Mağazayı belirle
        let store = 'Bilinmiyor';
        if (url.includes('hepsiburada.com')) {
            store = 'Hepsiburada';
        } else if (url.includes('trendyol.com')) {
            store = 'Trendyol';
        } else if (url.includes('amazon.com.tr')) {
            store = 'Amazon';
        } else if (url.includes('mediamarkt.com.tr')) {
            store = 'MediaMarkt';
        }
        
        // HTTP isteği
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        // Mağazaya göre farklı seçiciler kullan
        let price = null;
        let originalPrice = null;
        let title = null;
        let image = null;
        
        if (store === 'Hepsiburada') {
            // Hepsiburada için seçiciler
            price = parseFloat($('.product-price').text().replace(/[^0-9,]/g, '').replace(',', '.'));
            originalPrice = parseFloat($('.product-price-old').text().replace(/[^0-9,]/g, '').replace(',', '.'));
            title = $('.product-title').text().trim();
            image = $('.product-image img').attr('src');
        } else if (store === 'Trendyol') {
            // Trendyol için seçiciler
            price = parseFloat($('.prc-dsc').text().replace(/[^0-9,]/g, '').replace(',', '.'));
            originalPrice = parseFloat($('.prc-org').text().replace(/[^0-9,]/g, '').replace(',', '.'));
            title = $('.pr-new-br h1').text().trim();
            image = $('.gallery-modal-content img').attr('src');
        } else if (store === 'Amazon') {
            // Amazon için seçiciler
            price = parseFloat($('.a-price-whole').first().text().replace(/[^0-9,]/g, '').replace(',', '.'));
            originalPrice = parseFloat($('.a-text-price .a-offscreen').first().text().replace(/[^0-9,]/g, '').replace(',', '.'));
            title = $('#productTitle').text().trim();
            image = $('#landingImage').attr('src');
        }
        
        // Eğer fiyat bulunamadıysa hata döndür
        if (!price) {
            return res.status(404).json({ message: 'Fiyat bilgisi bulunamadı' });
        }
        
        // Sonuçları döndür
        res.json({
            price,
            originalPrice: originalPrice || price,
            title,
            image,
            store
        });
    } catch (error) {
        console.error('Scraping hatası:', error.message);
        res.status(500).json({ message: 'Veri çekilirken bir hata oluştu' });
    }
});

// WebSocket Bağlantısı
io.on('connection', (socket) => {
    console.log('Yeni bir kullanıcı bağlandı');

    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı');
    });
});

// Fiyat Takip Fonksiyonu
async function checkPrices() {
    try {
        console.log('Fiyat kontrolü başlatılıyor...');
        const products = await Product.find();
        
        for (const product of products) {
            try {
                // Mağazayı kontrol et
                if (!product.link || 
                    !(product.link.includes('hepsiburada.com') || 
                      product.link.includes('trendyol.com') || 
                      product.link.includes('amazon.com.tr'))) {
                    continue;
                }
                
                // HTTP isteği
                const response = await axios.get(product.link, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
                    },
                    timeout: 10000 // 10 saniye timeout
                });
                
                const $ = cheerio.load(response.data);
                
                // Mağazaya göre farklı seçiciler kullan
                let newPrice = null;
                
                if (product.link.includes('hepsiburada.com')) {
                    newPrice = parseFloat($('.product-price').text().replace(/[^0-9,]/g, '').replace(',', '.'));
                } else if (product.link.includes('trendyol.com')) {
                    newPrice = parseFloat($('.prc-dsc').text().replace(/[^0-9,]/g, '').replace(',', '.'));
                } else if (product.link.includes('amazon.com.tr')) {
                    newPrice = parseFloat($('.a-price-whole').first().text().replace(/[^0-9,]/g, '').replace(',', '.'));
                }
                
                // Fiyatı güncelle
                if (newPrice && newPrice !== product.currentPrice) {
                    const oldPrice = product.currentPrice;
                    product.currentPrice = newPrice;
                    product.discount = Math.round(((product.originalPrice - newPrice) / product.originalPrice) * 100);
                    product.lastUpdated = new Date();
                    await product.save();

                    // WebSocket ile bildirim gönder
                    io.emit('price_update', {
                        id: product._id,
                        title: product.title,
                        oldPrice: oldPrice,
                        newPrice: newPrice,
                        discount: product.discount
                    });
                    
                    console.log(`Fiyat güncellendi: ${product.title} - ${oldPrice} TL -> ${newPrice} TL`);
                }

                // Her istek arasında kısa bir bekleme süresi
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`Ürün fiyatı kontrol edilirken hata: ${product.title}`, error.message);
                continue; // Hata durumunda diğer ürüne geç
            }
        }
        console.log('Fiyat kontrolü tamamlandı.');
    } catch (error) {
        console.error('Fiyat kontrolü sırasında hata:', error);
    }
}

// Render'da sleep modunu önlemek için her 14 dakikada bir kontrol
const PRICE_CHECK_INTERVAL = 14 * 60 * 1000; // 14 dakika
setInterval(checkPrices, PRICE_CHECK_INTERVAL);

// İlk kontrolü hemen başlat
checkPrices().catch(console.error);

// Render health check endpoint'i
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', time: new Date().toISOString() });
});

// Statik dosyaları servis et
app.use(express.static('public'));

// Ana sayfayı yönlendir
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Yönetim panelini yönlendir
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/admin.html');
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
    console.log(`Ana sayfa: http://localhost:${PORT}`);
    console.log(`Yönetim paneli: http://localhost:${PORT}/admin`);
}); 