const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const https = require('https');
const socketIo = require('socket.io');
const axios = require('axios');
const cheerio = require('cheerio');
const { ServerApiVersion } = require('mongodb');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Helmet güvenlik başlıkları
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "https:", "http:", "data:", "blob:", "wss:", "ws:"],
            connectSrc: ["'self'", "wss://*", "ws://*", "https://*", "http://*"],
            imgSrc: ["'self'", "data:", "https://*", "http://*", "blob:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*", "http://*"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://*", "http://*"],
            fontSrc: ["'self'", "https://*", "http://*", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", "https://*", "http://*"],
            frameSrc: ["'self'", "https://*", "http://*"],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["'self'", "blob:"],
            formAction: ["'self'"],
            upgradeInsecureRequests: null
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS ayarları
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'https://localhost:3000',
            'https://indirimani.onrender.com',
            'https://www.indirimani.onrender.com'
        ];
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, true); // Geliştirme aşamasında tüm originlere izin ver
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    maxAge: 86400
};

app.use(cors(corsOptions));

// Trust proxy ayarı
app.set('trust proxy', true);

// HTTPS yönlendirmesi
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect('https://' + req.headers.host + req.url);
        }
    }
    next();
});

// Socket.IO ayarları
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
        transports: ['websocket', 'polling']
    },
    allowEIO3: true,
    pingTimeout: 60000,
    transports: ['websocket', 'polling']
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
                
                // HTTP isteği için farklı User-Agent'lar
                const userAgents = [
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
                    'Mozilla/5.0 (iPad; CPU OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
                ];
                
                const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
                
                // HTTP isteği
                const response = await axios.get(product.link, {
                    headers: {
                        'User-Agent': randomUserAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Referer': 'https://www.google.com/'
                    },
                    timeout: 30000, // 30 saniye timeout
                    maxRedirects: 5
                });
                
                const $ = cheerio.load(response.data);
                
                // Mağazaya göre farklı seçiciler kullan
                let newPrice = null;
                let title = null;
                
                if (product.link.includes('hepsiburada.com')) {
                    newPrice = parseFloat($('span[data-bind="markupText:\'currentPriceBeforePoint\'"]').first().text().replace(/[^0-9,]/g, '').replace(',', '.'));
                    title = $('h1[itemprop="name"]').text().trim();
                } else if (product.link.includes('trendyol.com')) {
                    newPrice = parseFloat($('span.prc-dsc').first().text().replace(/[^0-9,]/g, '').replace(',', '.'));
                    title = $('h1.pr-new-br').text().trim();
                } else if (product.link.includes('amazon.com.tr')) {
                    newPrice = parseFloat($('span.a-price-whole').first().text().replace(/[^0-9,]/g, '').replace(',', '.'));
                    title = $('#productTitle').text().trim();
                }
                
                // Fiyatı güncelle
                if (newPrice && !isNaN(newPrice) && newPrice > 0) {
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
                } else {
                    console.log(`Fiyat bulunamadı veya geçersiz: ${product.title}`);
                }

                // Her istek arasında rastgele bekleme süresi (2-5 saniye)
                const delay = Math.floor(Math.random() * (5000 - 2000 + 1) + 2000);
                await new Promise(resolve => setTimeout(resolve, delay));

            } catch (error) {
                console.error(`Ürün fiyatı kontrol edilirken hata: ${product.title}`, error.message);
                // Hata durumunda daha uzun bir bekleme süresi (10-15 saniye)
                const errorDelay = Math.floor(Math.random() * (15000 - 10000 + 1) + 10000);
                await new Promise(resolve => setTimeout(resolve, errorDelay));
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
setTimeout(checkPrices, 5000); // 5 saniye sonra başlat

// Render health check endpoint'i
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

// Statik dosyaları servis et (helmet'ten sonra olmalı)
app.use('/', express.static('public', {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
    }
}));

// Ana sayfayı yönlendir
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Yönetim panelini yönlendir
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/public/admin.html');
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
    console.log(`Ana sayfa: http://localhost:${PORT}`);
    console.log(`Yönetim paneli: http://localhost:${PORT}/admin`);
}); 