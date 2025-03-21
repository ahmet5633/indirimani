document.addEventListener('DOMContentLoaded', () => {
    // Mobil menü işlevselliği
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('show');
            mobileMenuBtn.querySelector('i').classList.toggle('fa-bars');
            mobileMenuBtn.querySelector('i').classList.toggle('fa-times');
        });
    }

    // WebSocket bağlantısı - dinamik URL
    const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${socketProtocol}//${window.location.host}`;
    const socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
    });
    
    // Bildirim ayarları
    const notificationSettings = {
        enabled: false,
        discountThreshold: 40,
        categories: {
            all: true,
            elektronik: true,
            giyim: true,
            ev: true,
            kozmetik: true,
            kitap: true
        }
    };

    // Bildirim izni kontrolü ve isteme
    async function checkAndRequestNotifications() {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                notificationSettings.enabled = true;
            } else if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                notificationSettings.enabled = permission === 'granted';
            }
        }
    }

    // Bildirim gösterme fonksiyonu
    function showNotification(title, body) {
        if (notificationSettings.enabled) {
            try {
                const notification = new Notification(title, {
                    body: body,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    vibrate: [200, 100, 200]
                });

                notification.onclick = function() {
                    window.focus();
                    this.close();
                };
            } catch (error) {
                console.error('Bildirim gösterilirken hata:', error);
            }
        }
    }

    // Bildirim butonunu ayarla
    const notificationBtn = document.getElementById('notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', async () => {
            await checkAndRequestNotifications();
            if (notificationSettings.enabled) {
                showNotification('Bildirimler Aktif', 'Artık fiyat değişikliklerinden haberdar olacaksınız!');
            }
        });
    }

    // Sayfa yüklendiğinde bildirim iznini kontrol et
    checkAndRequestNotifications();

    // WebSocket bağlantı durumu kontrolü
    socket.on('connect', () => {
        console.log('Sunucuya bağlandı');
        showConnectionStatus('online');
    });

    socket.on('disconnect', () => {
        console.log('Sunucu bağlantısı kesildi');
        showConnectionStatus('offline');
    });

    socket.on('connect_error', (error) => {
        console.error('Bağlantı hatası:', error);
        showConnectionStatus('error');
    });

    // Bağlantı durumu göstergesi
    function showConnectionStatus(status) {
        const statusIndicator = document.createElement('div');
        statusIndicator.className = `connection-status ${status}`;
        
        let message = '';
        switch(status) {
            case 'online':
                message = 'Sunucu bağlantısı aktif';
                break;
            case 'offline':
                message = 'Sunucu bağlantısı kesildi, yeniden bağlanılıyor...';
                break;
            case 'error':
                message = 'Bağlantı hatası oluştu, tekrar deneniyor...';
                break;
        }
        
        statusIndicator.textContent = message;
        
        // Varolan status göstergesini kaldır
        const existingStatus = document.querySelector('.connection-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        // Yeni status göstergesini ekle
        document.body.appendChild(statusIndicator);
        
        // Status offline değilse 3 saniye sonra göstergeyi kaldır
        if (status === 'online') {
            setTimeout(() => statusIndicator.remove(), 3000);
        }
    }

    // Fiyat güncellemelerini dinle
    socket.on('price_update', (data) => {
        if (notificationSettings.enabled) {
            const category = data.category || 'all';
            if (notificationSettings.categories.all || notificationSettings.categories[category]) {
                if (data.discount >= notificationSettings.discountThreshold) {
                    const message = `${data.title} ürününün fiyatı ${data.oldPrice} TL'den ${data.newPrice} TL'ye düştü! (%${data.discount} indirim)`;
                    showNotification('Fiyat Düştü! 🎉', message);
                    
                    // Bildirim listesine ekle
                    addNotificationToList(data);
                }
            }
        }
    });

    // Ürünleri getir ve görüntüle
    async function fetchProducts() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) {
                throw new Error('Ürünler yüklenirken bir hata oluştu');
            }
            const products = await response.json();
            displayProducts(products);
        } catch (error) {
            console.error('Ürünler yüklenirken hata:', error);
            showError('Ürünler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
        }
    }

    // Hata mesajı gösterme
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.insertBefore(errorDiv, document.body.firstChild);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    // Sayfa yüklendiğinde ürünleri getir
    fetchProducts();

    // Ürünleri API'den çek
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
    const notificationModal = document.getElementById('notification-modal');
    const closeBtn = document.querySelector('.close');
    const enableNotificationsBtn = document.getElementById('enable-notifications');
    const discountThresholdSelect = document.getElementById('discount-threshold');
    const notificationStatusText = document.getElementById('notification-status-text');
    const notificationList = document.getElementById('notification-list');
    const notificationBadge = document.querySelector('.notification-badge');
    
    // Bildirim izni iste
    async function requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                notificationSettings.enabled = true;
                updateNotificationUI();
                saveNotificationSettings();
                showToast('Bildirimler başarıyla etkinleştirildi!');
            } else {
                showToast('Bildirim izni reddedildi. Lütfen tarayıcı ayarlarından bildirimleri etkinleştirin.');
            }
        } catch (error) {
            console.error('Bildirim izni alınamadı:', error);
            showToast('Bildirim izni alınamadı. Lütfen tarayıcı ayarlarınızı kontrol edin.');
        }
    }

    // Bildirim ayarlarını kaydet
    function saveNotificationSettings() {
        localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
    }

    // Bildirim ayarlarını yükle
    function loadNotificationSettings() {
        const savedSettings = localStorage.getItem('notificationSettings');
        if (savedSettings) {
            Object.assign(notificationSettings, JSON.parse(savedSettings));
            updateNotificationUI();
        }
    }

    // Bildirim arayüzünü güncelle
    function updateNotificationUI() {
        const statusText = document.getElementById('notification-status-text');
        const enableButton = document.getElementById('enable-notifications');
        const discountSelect = document.getElementById('discount-threshold');
        
        if (notificationSettings.enabled) {
            statusText.textContent = 'Bildirimler etkinleştirildi.';
            enableButton.textContent = 'Bildirimleri Devre Dışı Bırak';
            enableButton.classList.add('disabled');
        } else {
            statusText.textContent = 'Fiyat değişimlerinden anında haberdar olmak için bildirimleri etkinleştirin.';
            enableButton.textContent = 'Bildirimleri Etkinleştir';
            enableButton.classList.remove('disabled');
        }
        
        discountSelect.value = notificationSettings.discountThreshold;
        
        // Kategori checkbox'larını güncelle
        Object.keys(notificationSettings.categories).forEach(category => {
            const checkbox = document.getElementById(`cat-${category}`);
            if (checkbox) {
                checkbox.checked = notificationSettings.categories[category];
            }
        });
    }

    // Bildirim gönder
    function sendNotification(title, message, product) {
        if (!notificationSettings.enabled) return;
        
        const discount = calculateDiscount(product.oldPrice, product.currentPrice);
        if (discount < notificationSettings.discountThreshold) return;
        
        if (!notificationSettings.categories.all && !notificationSettings.categories[product.category]) return;
        
        const notification = new Notification(title, {
            body: message,
            icon: '/images/logo.png'
        });
        
        notification.onclick = () => {
            window.open(product.link, '_blank');
        };
        
        addNotificationToList(title, message, product);
    }

    // Bildirim Listesine Ekle
    function addNotificationToList(title, message, product) {
        const notificationList = document.getElementById('notification-list');
        const emptyNotification = notificationList.querySelector('.empty-notification');
        
        if (emptyNotification) {
            emptyNotification.remove();
        }
        
        const notificationItem = document.createElement('div');
        notificationItem.className = 'notification-item';
        notificationItem.innerHTML = `
            <div class="notification-info">
                <div class="notification-title">${title}</div>
                <div class="notification-price">
                    Eski Fiyat: ${formatPrice(product.oldPrice)} TL
                    <span class="price-change">Yeni Fiyat: ${formatPrice(product.currentPrice)} TL</span>
                </div>
                <div class="notification-time">${new Date().toLocaleString()}</div>
            </div>
            <div class="notification-action">
                <a href="${product.link}" target="_blank">Ürünü Görüntüle</a>
            </div>
        `;
        
        notificationList.insertBefore(notificationItem, notificationList.firstChild);
        
        // Maksimum 10 bildirim göster
        const notifications = notificationList.querySelectorAll('.notification-item');
        if (notifications.length > 10) {
            notifications[notifications.length - 1].remove();
        }
    }

    // Event Listeners
    notificationBtn.addEventListener('click', () => {
        notificationModal.style.display = 'block';
    });

    closeBtn.addEventListener('click', () => {
        notificationModal.style.display = 'none';
    });

    enableNotificationsBtn.addEventListener('click', requestNotificationPermission);

    if (discountThresholdSelect) {
        discountThresholdSelect.addEventListener('change', (e) => {
            notificationSettings.discountThreshold = parseInt(e.target.value);
            saveNotificationSettings();
        });
    }

    // Kategori checkbox'ları için event listener'lar
    Object.keys(notificationSettings.categories).forEach(category => {
        const checkbox = document.getElementById(`cat-${category}`);
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                notificationSettings.categories[category] = e.target.checked;
                
                // "Tümü" checkbox'ı için özel işlem
                if (category === 'all') {
                    Object.keys(notificationSettings.categories).forEach(cat => {
                        if (cat !== 'all') {
                            const otherCheckbox = document.getElementById(`cat-${cat}`);
                            if (otherCheckbox) {
                                otherCheckbox.checked = e.target.checked;
                                notificationSettings.categories[cat] = e.target.checked;
                            }
                        }
                    });
                } else {
                    // Diğer checkbox'lar için "Tümü" durumunu kontrol et
                    const allCheckbox = document.getElementById('cat-all');
                    const allChecked = Object.keys(notificationSettings.categories)
                        .filter(cat => cat !== 'all')
                        .every(cat => notificationSettings.categories[cat]);
                    allCheckbox.checked = allChecked;
                    notificationSettings.categories.all = allChecked;
                }
                
                saveNotificationSettings();
            });
        }
    });

    // Sayfa yüklendiğinde ayarları yükle
    loadNotificationSettings();

    // Otomatik sayfa yenileme
    let lastUpdate = Date.now();
    const AUTO_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 dakika

    function checkForUpdates() {
        const now = Date.now();
        if (now - lastUpdate > AUTO_REFRESH_INTERVAL) {
            console.log('Otomatik yenileme yapılıyor...');
            fetchProducts();
            lastUpdate = now;
        }
    }

    // Her dakika güncelleme kontrolü yap
    setInterval(checkForUpdates, 60 * 1000);

    // Yardımcı Fonksiyonlar
    function calculateDiscount(oldPrice, newPrice) {
        return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
    }

    function formatPrice(price) {
        return price.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}); 