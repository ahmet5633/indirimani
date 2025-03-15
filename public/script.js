document.addEventListener('DOMContentLoaded', () => {
    // WebSocket bağlantısı - dinamik URL
    const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${socketProtocol}//${window.location.host}`;
    const socket = io(socketUrl);
    
    // Bildirim değişkenleri
    let notificationsEnabled = false;
    
    // Ürünleri API'den çek
    async function fetchProducts() {
        try {
            const response = await fetch('/api/products');
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
            const response = await fetch(`/api/products/${category}`);
            const products = await response.json();
            displayDeals(products);
        } catch (error) {
            console.error('Kategori ürünleri yüklenirken hata:', error);
        }
    }

    // Filtreleme fonksiyonu
    function filterDeals(category) {
        if (category === 'all') {
            fetchProducts();
        } else {
            fetchProductsByCategory(category);
        }
    }

    // Ürünleri göster
    function displayDeals(deals) {
        const dealsContainer = document.getElementById('deals-container');
        dealsContainer.innerHTML = '';

        if (!deals || deals.length === 0) {
            dealsContainer.innerHTML = '<div class="no-deals">Henüz indirim bulunamadı.</div>';
            return;
        }

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
                    <span class="deal-time"><i class="far fa-clock"></i> ${deal.time || 'Yeni eklendi'}</span>
                    <a href="${deal.link}" target="_blank" class="deal-link">Fırsata Git <i class="fas fa-arrow-right"></i></a>
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
                sortedDeals.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
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
            filterDeals(category);
        });
    });

    // Sıralama için event listener
    document.getElementById('sort').addEventListener('change', (e) => {
        // Mevcut aktif kategoriyi bul
        const activeCategory = document.querySelector('.filter-btn.active').getAttribute('data-filter');
        
        // Filtreleme yap
        filterDeals(activeCategory);
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
            filterDeals(activeCategory);
            return;
        }
        
        // API'den arama yap
        fetch(`/api/products?search=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(products => displayDeals(products))
            .catch(error => console.error('Arama hatası:', error));
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
                icon: "/favicon.ico" // Favicon ekleyin
            });
            
            notification.onclick = function() {
                window.focus();
                this.close();
            };
        }
    }
    
    // Uygulama içi bildirim ekle
    function addNotificationToList(product) {
        // Boş bildirim mesajını kaldır
        const emptyNotification = document.querySelector('.empty-notification');
        if (emptyNotification) {
            emptyNotification.remove();
        }
        
        // Fiyat formatla
        const formatPrice = (price) => {
            return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        };
        
        const priceChange = Math.round(((product.oldPrice - product.newPrice) / product.oldPrice) * 100);
        const now = new Date();
        const timeString = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        
        const notificationItem = document.createElement('div');
        notificationItem.className = 'notification-item';
        notificationItem.innerHTML = `
            <div class="notification-info">
                <div class="notification-title">${product.title}</div>
                <div class="notification-price">
                    <span class="original-price">${formatPrice(product.oldPrice)} TL</span> → 
                    <span class="current-price">${formatPrice(product.newPrice)} TL</span>
                    <span class="price-change">(%${priceChange} ↓)</span>
                </div>
                <div class="notification-time">Bugün, ${timeString}</div>
            </div>
            <div class="notification-action">
                <a href="${product.link || '#'}" target="_blank">Ürüne Git <i class="fas fa-arrow-right"></i></a>
            </div>
        `;
        
        // Listeye ekle
        notificationList.prepend(notificationItem);
        
        // Bildirim sayısını artır
        const currentCount = parseInt(notificationBadge.textContent);
        notificationBadge.textContent = currentCount + 1;
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