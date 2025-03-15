document.addEventListener('DOMContentLoaded', () => {
    // WebSocket bağlantısı
    const socket = io('http://localhost:3000');
    
    // Ürünleri API'den çek
    async function fetchProducts() {
        try {
            const response = await fetch('http://localhost:3000/api/products');
            const products = await response.json();
            displayDeals(products);
        } catch (error) {
            console.error('Ürünler yüklenirken hata:', error);
        }
    }

    // WebSocket olaylarını dinle
    socket.on('price_update', (data) => {
        // Bildirim göster
        if (notificationsEnabled && Notification.permission === "granted") {
            showNotification(
                "Fiyat Değişimi!",
                `${data.title} ürününün fiyatı ${data.oldPrice} TL'den ${data.newPrice} TL'ye düştü! (%${data.discount} indirim)`
            );
            
            // Uygulama içi bildirim ekle
            addNotificationToList(data);
        }
        
        // Ürün listesini güncelle
        fetchProducts();
    });

    // Kategoriye göre ürünleri getir
    async function fetchProductsByCategory(category) {
        try {
            const response = await fetch(`http://localhost:3000/api/products/${category}`);
            const products = await response.json();
            displayDeals(products);
        } catch (error) {
            console.error('Kategori ürünleri yüklenirken hata:', error);
        }
    }

    // Filtreleme fonksiyonunu güncelle
    function filterDeals(category) {
        if (category === 'all') {
            fetchProducts();
        } else {
            fetchProductsByCategory(category);
        }
    }

    // Örnek ürün verileri (gerçek uygulamada API'den gelir)
    const dealsData = [
        {
            id: 1,
            title: "Apple AirPods Pro 2. Nesil - Beyaz",
            currentPrice: 4999,
            originalPrice: 7999,
            discount: 38,
            image: "https://productimages.hepsiburada.net/s/189/550/110000155170656.jpg",
            store: "Hepsiburada",
            category: "elektronik",
            time: "3 saat önce",
            link: "#"
        },
        {
            id: 2,
            title: "Samsung Galaxy S23 Ultra 256GB - Yeşil",
            currentPrice: 39999,
            originalPrice: 49999,
            discount: 20,
            image: "https://productimages.hepsiburada.net/s/372/550/110000389833053.jpg",
            store: "Amazon",
            category: "elektronik",
            time: "5 saat önce",
            link: "#"
        },
        {
            id: 3,
            title: "Philips Lumea IPL Epilasyon Cihazı",
            currentPrice: 7490,
            originalPrice: 12590,
            discount: 41,
            image: "https://productimages.hepsiburada.net/s/181/550/110000145698166.jpg",
            store: "Trendyol",
            category: "kozmetik",
            time: "1 gün önce",
            link: "#"
        },
        {
            id: 4,
            title: "IKEA BILLY Kitaplık - Beyaz",
            currentPrice: 1999,
            originalPrice: 2799,
            discount: 29,
            image: "https://productimages.hepsiburada.net/s/39/550/10614057050162.jpg",
            store: "IKEA",
            category: "ev",
            time: "2 saat önce",
            link: "#"
        },
        {
            id: 5,
            title: "Nike Air Force 1 Erkek Spor Ayakkabı",
            currentPrice: 2199,
            originalPrice: 3299,
            discount: 33,
            image: "https://productimages.hepsiburada.net/s/152/550/110000108542654.jpg",
            store: "Sportive",
            category: "giyim",
            time: "6 saat önce",
            link: "#"
        },
        {
            id: 6,
            title: "Elidor Saç Bakım Şampuanı 650ml 3'lü Set",
            currentPrice: 249,
            originalPrice: 459,
            discount: 46,
            image: "https://productimages.hepsiburada.net/s/305/550/110000296792877.jpg",
            store: "Migros",
            category: "kozmetik",
            time: "1 gün önce",
            link: "#"
        },
        {
            id: 7,
            title: "JBL Tune 510BT Kulaküstü Bluetooth Kulaklık",
            currentPrice: 999,
            originalPrice: 1799,
            discount: 45,
            image: "https://productimages.hepsiburada.net/s/88/550/110000030487168.jpg",
            store: "MediaMarkt",
            category: "elektronik",
            time: "12 saat önce",
            link: "#"
        },
        {
            id: 8,
            title: "The Lord of the Rings Tolkien Özel Seti",
            currentPrice: 349,
            originalPrice: 499,
            discount: 30,
            image: "https://productimages.hepsiburada.net/s/8/550/9045386469426.jpg",
            store: "D&R",
            category: "kitap",
            time: "2 gün önce",
            link: "#"
        }
    ];

    // Ürünleri göster
    function displayDeals(deals) {
        const dealsContainer = document.getElementById('deals-container');
        dealsContainer.innerHTML = '';

        deals.forEach(deal => {
            const dealCard = document.createElement('div');
            dealCard.className = `deal-card ${deal.category}`;
            
            // Fiyat formatı
            const formatPrice = (price) => {
                return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            };

            dealCard.innerHTML = `
                <div class="deal-image">
                    <img src="${deal.image}" alt="${deal.title}">
                    <div class="discount-badge">%${deal.discount} İndirim</div>
                    <div class="store-badge">${deal.store}</div>
                </div>
                <div class="deal-content">
                    <h3 class="deal-title">${deal.title}</h3>
                    <div class="deal-price">
                        <span class="current-price">${formatPrice(deal.currentPrice)} TL</span>
                        <span class="original-price">${formatPrice(deal.originalPrice)} TL</span>
                    </div>
                </div>
                <div class="deal-footer">
                    <span class="deal-time"><i class="far fa-clock"></i> ${deal.time}</span>
                    <a href="${deal.link}" class="deal-link">Fırsata Git <i class="fas fa-arrow-right"></i></a>
                </div>
            `;

            dealsContainer.appendChild(dealCard);
        });
    }

    // Sıralama
    function sortDeals(deals, criterion) {
        const sortedDeals = [...deals];
        
        switch (criterion) {
            case 'newest':
                // Varsayılan sıralama, değişiklik yok
                break;
            case 'discount':
                sortedDeals.sort((a, b) => b.discount - a.discount);
                break;
            case 'price-low':
                sortedDeals.sort((a, b) => a.currentPrice - b.currentPrice);
                break;
            case 'price-high':
                sortedDeals.sort((a, b) => b.currentPrice - a.currentPrice);
                break;
        }
        
        return sortedDeals;
    }

    // Filtreleme butonları için event listeners
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Aktif butonu güncelle
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Filtreleme yap
            const category = button.getAttribute('data-filter');
            const filteredDeals = filterDeals(category);
            
            // Sıralama yap
            const sortCriterion = document.getElementById('sort').value;
            const sortedAndFilteredDeals = sortDeals(filteredDeals, sortCriterion);
            
            // Göster
            displayDeals(sortedAndFilteredDeals);
        });
    });

    // Sıralama için event listener
    document.getElementById('sort').addEventListener('change', (e) => {
        // Mevcut aktif kategoriyi bul
        const activeCategory = document.querySelector('.filter-btn.active').getAttribute('data-filter');
        
        // Filtreleme yap
        const filteredDeals = filterDeals(activeCategory);
        
        // Sıralama yap
        const sortedAndFilteredDeals = sortDeals(filteredDeals, e.target.value);
        
        // Göster
        displayDeals(sortedAndFilteredDeals);
    });

    // İlk yükleme
    fetchProducts();

    // Arama kutusu işlevselliği
    const searchBox = document.querySelector('.search-box input');
    const searchButton = document.querySelector('.search-box button');

    function searchDeals(query) {
        if (!query) {
            // Eğer arama terimi boşsa, aktif kategoriyi göster
            const activeCategory = document.querySelector('.filter-btn.active').getAttribute('data-filter');
            const filteredDeals = filterDeals(activeCategory);
            const sortCriterion = document.getElementById('sort').value;
            displayDeals(sortDeals(filteredDeals, sortCriterion));
            return;
        }
        
        query = query.toLowerCase();
        const results = dealsData.filter(deal => 
            deal.title.toLowerCase().includes(query) || 
            deal.store.toLowerCase().includes(query) ||
            deal.category.toLowerCase().includes(query)
        );
        
        const sortCriterion = document.getElementById('sort').value;
        displayDeals(sortDeals(results, sortCriterion));
    }

    searchButton.addEventListener('click', () => {
        searchDeals(searchBox.value);
    });

    searchBox.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchDeals(searchBox.value);
        }
    });

    // ----- Bildirim Sistemi ----- //
    
    // Bildirim modalı
    const modal = document.getElementById('notification-modal');
    const notificationBtn = document.getElementById('notification-btn');
    const closeBtn = document.querySelector('.close');
    const enableNotificationsBtn = document.getElementById('enable-notifications');
    const statusText = document.getElementById('notification-status-text');
    const notificationList = document.getElementById('notification-list');
    const notificationBadge = document.querySelector('.notification-badge');
    
    // Modal aç/kapa
    notificationBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Bildirim izni
    let notificationsEnabled = false;
    
    enableNotificationsBtn.addEventListener('click', async () => {
        try {
            // Web bildirim izni iste
            if (Notification.permission !== "granted") {
                const permission = await Notification.requestPermission();
                
                if (permission === "granted") {
                    notificationsEnabled = true;
                    statusText.textContent = "Bildirimler etkinleştirildi! Artık fiyat değişimlerinden anında haberdar olacaksınız.";
                    enableNotificationsBtn.textContent = "Bildirimler Etkin";
                    enableNotificationsBtn.disabled = true;
                    
                    // Simülasyon başlat
                    startPriceChangeSimulation();
                    
                    // Test bildirimi
                    showNotification("Bildirimler Etkinleştirildi", "Artık %40 ve üzeri indirimleri anlık takip edebilirsiniz.");
                } else {
                    statusText.textContent = "Bildirim izni verilmedi. Bildirimleri almak için izin vermelisiniz.";
                }
            } else {
                notificationsEnabled = true;
                statusText.textContent = "Bildirimler etkinleştirildi! Artık fiyat değişimlerinden anında haberdar olacaksınız.";
                enableNotificationsBtn.textContent = "Bildirimler Etkin";
                enableNotificationsBtn.disabled = true;
                
                // Simülasyon başlat
                startPriceChangeSimulation();
            }
        } catch (error) {
            statusText.textContent = "Bildirim izni istenirken bir hata oluştu: " + error.message;
        }
    });
    
    // Bildirim göster
    function showNotification(title, body) {
        // Web sayfası bildirimi
        if (notificationsEnabled && Notification.permission === "granted") {
            const notification = new Notification(title, {
                body: body,
                icon: "https://productimages.hepsiburada.net/s/189/550/110000155170656.jpg" // Örnek bir ikon
            });
            
            notification.onclick = function() {
                window.focus();
                this.close();
            };
        }
    }
    
    // Uygulama içi bildirim ekle
    function addNotificationToList(product, oldPrice, newPrice) {
        // Boş bildirim mesajını kaldır
        const emptyNotification = document.querySelector('.empty-notification');
        if (emptyNotification) {
            emptyNotification.remove();
        }
        
        // Fiyat formatla
        const formatPrice = (price) => {
            return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        };
        
        const priceChange = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
        const now = new Date();
        const timeString = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        
        const notificationItem = document.createElement('div');
        notificationItem.className = 'notification-item';
        notificationItem.innerHTML = `
            <div class="notification-info">
                <div class="notification-title">${product.title}</div>
                <div class="notification-price">
                    <span class="original-price">${formatPrice(oldPrice)} TL</span> → 
                    <span class="current-price">${formatPrice(newPrice)} TL</span>
                    <span class="price-change">(%${priceChange} ↓)</span>
                </div>
                <div class="notification-time">Bugün, ${timeString}</div>
            </div>
            <div class="notification-action">
                <a href="#">Ürüne Git <i class="fas fa-arrow-right"></i></a>
            </div>
        `;
        
        // Listeye ekle
        notificationList.prepend(notificationItem);
        
        // Bildirim sayısını artır
        const currentCount = parseInt(notificationBadge.textContent);
        notificationBadge.textContent = currentCount + 1;
    }
    
    // Gerçek zamanlı fiyat değişimi simülasyonu
    function startPriceChangeSimulation() {
        // Bildirim eşiği değerini al
        const thresholdSelect = document.getElementById('discount-threshold');
        const threshold = parseInt(thresholdSelect.value);
        
        // Kategori seçimlerini al
        const selectedCategories = [];
        document.querySelectorAll('.checkbox-group input:checked').forEach(checkbox => {
            selectedCategories.push(checkbox.value);
        });
        
        // İlk bildirimi 10 saniye sonra, sonrakileri rastgele aralıklarla oluştur
        setTimeout(() => {
            // Örnek bir fiyat düşüşü simüle et
            const randomIndex = Math.floor(Math.random() * dealsData.length);
            const product = dealsData[randomIndex];
            
            // Kategorisi seçilen ürünlerden seç
            if (selectedCategories.includes(product.category) || selectedCategories.length === 0) {
                const oldPrice = product.originalPrice;
                const newPrice = Math.round(oldPrice * 0.55); // %45 indirim
                
                // Ürün fiyatını güncelle ve bildirimleri göster
                if (((oldPrice - newPrice) / oldPrice) * 100 >= threshold) {
                    // Bildirim göster
                    showNotification(
                        "Yeni İndirim Fırsatı!", 
                        `${product.title} şimdi %${Math.round(((oldPrice - newPrice) / oldPrice) * 100)} indirimde!`
                    );
                    
                    // Uygulama içi bildirim ekle
                    addNotificationToList(product, oldPrice, newPrice);
                }
            }
            
            // Sonraki bildirimi 20-60 saniye arasında rastgele bir zamanda oluştur
            const nextInterval = Math.random() * (60000 - 20000) + 20000;
            setTimeout(startPriceChangeSimulation, nextInterval);
        }, 10000);
    }
    
    // Bildirim ayarları değişikliği izle
    document.getElementById('discount-threshold').addEventListener('change', () => {
        if (notificationsEnabled) {
            statusText.textContent = "Bildirim ayarlarınız güncellendi!";
        }
    });
    
    // Kategori checkboxları değişikliğini izle
    document.querySelectorAll('.checkbox-group input').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (notificationsEnabled) {
                statusText.textContent = "Bildirim kategorileriniz güncellendi!";
            }
        });
    });
}); 