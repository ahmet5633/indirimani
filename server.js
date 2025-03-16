const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const cheerio = require('cheerio');
const { ServerApiVersion } = require('mongodb');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Güvenlik ayarları
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://code.jquery.com", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'"],
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: {
        action: 'sameorigin'
    },
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    }
}));

// CORS ayarları
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Trust proxy ayarı
app.enable('trust proxy');

// HTTPS yönlendirmesi
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

// Statik dosyaları servis et
app.use(express.static('public', {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO ayarları
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

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
        
        if (!products || products.length === 0) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }
        
        res.json(products);
    } catch (error) {
        console.error('Ürün listesi alınırken hata:', error);
        res.status(500).json({ 
            message: 'Ürünler yüklenirken bir hata oluştu',
            error: error.message 
        });
    }
});

app.get('/api/products/:category', async (req, res) => {
    try {
        const products = await Product.find({ category: req.params.category }).sort({ lastUpdated: -1 });
        
        if (!products || products.length === 0) {
            return res.status(404).json({ message: 'Bu kategoride ürün bulunamadı' });
        }
        
        res.json(products);
    } catch (error) {
        console.error('Kategori ürünleri alınırken hata:', error);
        res.status(500).json({ 
            message: 'Ürünler yüklenirken bir hata oluştu',
            error: error.message 
        });
    }
});

// Yeni ürün ekle
app.post('/api/products', async (req, res) => {
    try {
        if (!req.body.title || !req.body.currentPrice || !req.body.link) {
            return res.status(400).json({ 
                message: 'Gerekli alanlar eksik',
                required: ['title', 'currentPrice', 'link']
            });
        }

        const newProduct = new Product(req.body);
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        console.error('Ürün eklenirken hata:', error);
        res.status(400).json({ 
            message: 'Ürün eklenirken bir hata oluştu',
            error: error.message 
        });
    }
});

// Ürün güncelle
app.put('/api/products/:id', async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }
        
        res.json(updatedProduct);
    } catch (error) {
        console.error('Ürün güncellenirken hata:', error);
        res.status(400).json({ 
            message: 'Ürün güncellenirken bir hata oluştu',
            error: error.message 
        });
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
        console.error('Ürün silinirken hata:', error);
        res.status(500).json({ 
            message: 'Ürün silinirken bir hata oluştu',
            error: error.message 
        });
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
                if (!product.link) {
                    console.log(`Ürün linki bulunamadı: ${product.title}`);
                    continue;
                }

                // Mağazayı belirle
                let store = 'Bilinmiyor';
                let selectors = {};
                
                if (product.link.includes('hepsiburada.com')) {
                    store = 'Hepsiburada';
                    selectors = {
                        price: 'div[data-test-id="price-current-price"]',
                        title: 'h1[itemprop="name"]'
                    };
                } else if (product.link.includes('trendyol.com')) {
                    store = 'Trendyol';
                    selectors = {
                        price: '.prc-dsc',
                        title: 'h1.pr-new-br'
                    };
                } else if (product.link.includes('amazon.com.tr')) {
                    store = 'Amazon';
                    selectors = {
                        price: '.a-price-whole',
                        title: '#productTitle'
                    };
                } else {
                    console.log(`Desteklenmeyen mağaza: ${product.link}`);
                    continue;
                }

                console.log(`Fiyat kontrol ediliyor: ${product.title} (${store})`);
                
                const response = await axios.get(product.link, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    },
                    timeout: 10000,
                    maxRedirects: 5,
                    validateStatus: function (status) {
                        return status >= 200 && status < 500;
                    }
                });

                if (response.status !== 200) {
                    console.log(`${store} için HTTP ${response.status} hatası: ${product.title}`);
                    continue;
                }

                const $ = cheerio.load(response.data);
                let newPrice = null;

                // Fiyatı çek
                const priceText = $(selectors.price).first().text().trim();
                if (priceText) {
                    newPrice = parseFloat(priceText.replace(/[^0-9,]/g, '').replace(',', '.'));
                }

                if (newPrice && !isNaN(newPrice) && newPrice > 0) {
                    const oldPrice = product.currentPrice;
                    product.currentPrice = newPrice;
                    product.discount = Math.round(((product.originalPrice - newPrice) / product.originalPrice) * 100);
                    product.lastUpdated = new Date();
                    await product.save();

                    console.log(`Fiyat güncellendi: ${product.title} - ${oldPrice} TL -> ${newPrice} TL (${store})`);

                    // WebSocket ile bildirim gönder
                    io.emit('price_update', {
                        id: product._id,
                        title: product.title,
                        oldPrice: oldPrice,
                        newPrice: newPrice,
                        discount: product.discount,
                        store: store
                    });
                } else {
                    console.log(`Geçerli fiyat bulunamadı: ${product.title} (${store})`);
                }

                // İstekler arası bekleme
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error) {
                console.error(`Ürün fiyatı kontrol edilirken hata (${product.title}):`, error.message);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        console.log('Fiyat kontrolü tamamlandı.');
    } catch (error) {
        console.error('Fiyat kontrolü sırasında genel hata:', error);
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

// Ping endpoint'i
app.get('/ping', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

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
    
    // Her 10 dakikada bir ping gönder
    setInterval(async () => {
        try {
            const response = await axios.get(`https://indirimani.onrender.com/ping`);
            console.log('Ping başarılı:', response.data);
        } catch (error) {
            console.error('Ping hatası:', error.message);
        }
    }, 10 * 60 * 1000);
}); 