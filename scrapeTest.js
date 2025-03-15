const axios = require('axios');
const cheerio = require('cheerio');

// Test edilecek URL (örnek bir ürün)
const testUrl = 'https://www.hepsiburada.com/apple-airpods-pro-2-nesil-p-HBCV00002NU9QS';

async function scrapeProductPrice(url) {
    try {
        console.log(`"${url}" adresinden veri çekiliyor...`);
        
        // HTTP isteği oluştur (tarayıcı gibi davranmak için user-agent ekle)
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });
        
        // HTML içeriğini yükle
        const $ = cheerio.load(response.data);
        
        // Hepsiburada için fiyat seçicileri (diğer siteler için değiştirilmeli)
        const priceSelector = '.product-price';
        
        // Fiyat bilgisini çek
        let priceText = $(priceSelector).text().trim();
        console.log('Çekilen ham fiyat:', priceText);
        
        // Fiyatı temizle ve sayıya dönüştür
        let price = priceText.replace(/[^0-9,]/g, '').replace(',', '.');
        price = parseFloat(price);
        
        if (price) {
            console.log('Ürün fiyatı:', price, 'TL');
        } else {
            console.log('Fiyat bilgisi bulunamadı.');
        }
        
        return price;
    } catch (error) {
        console.error('Veri çekerken hata oluştu:', error.message);
        return null;
    }
}

// Test fonksiyonunu çalıştır
scrapeProductPrice(testUrl); 