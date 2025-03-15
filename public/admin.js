document.addEventListener('DOMContentLoaded', () => {
    // WebSocket bağlantısı - dinamik URL
    const socketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${socketProtocol}//${window.location.host}`;
    const socket = io(socketUrl);
    
    // DOM elementleri
    const productList = document.getElementById('product-list');
    const productForm = document.getElementById('product-form');
    const productModal = document.getElementById('product-modal');
    const deleteModal = document.getElementById('delete-modal');
    const modalTitle = document.getElementById('modal-title');
    const addProductBtn = document.getElementById('add-product-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const searchInput = document.getElementById('search-product');
    const categoryFilter = document.getElementById('category-filter');
    const storeFilter = document.getElementById('store-filter');
    const discountFilter = document.getElementById('discount-filter');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    
    // İstatistik elementleri
    const totalProductsEl = document.getElementById('total-products');
    const avgDiscountEl = document.getElementById('avg-discount');
    const activeStoresEl = document.getElementById('active-stores');
    const lastUpdateEl = document.getElementById('last-update');
    
    // Form elementleri
    const productIdInput = document.getElementById('product-id');
    const productTitleInput = document.getElementById('product-title');
    const productCategoryInput = document.getElementById('product-category');
    const productStoreInput = document.getElementById('product-store');
    const productCurrentPriceInput = document.getElementById('product-current-price');
    const productOriginalPriceInput = document.getElementById('product-original-price');
    const productImageInput = document.getElementById('product-image');
    const productLinkInput = document.getElementById('product-link');
    const cancelBtn = document.getElementById('cancel-btn');
    
    // Silme modal elementleri
    const deleteConfirmBtn = document.getElementById('delete-confirm');
    const deleteCancelBtn = document.getElementById('delete-cancel');
    
    // Sayfalama değişkenleri
    let currentPage = 1;
    let totalPages = 1;
    let productsPerPage = 10;
    let currentProducts = [];
    let productToDelete = null;
    
    // Modal kapatma butonları
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            productModal.style.display = 'none';
            deleteModal.style.display = 'none';
        });
    });
    
    // Dışarı tıklayınca modalı kapat
    window.addEventListener('click', (e) => {
        if (e.target === productModal) {
            productModal.style.display = 'none';
        }
        if (e.target === deleteModal) {
            deleteModal.style.display = 'none';
        }
    });
    
    // Yeni ürün ekleme butonuna tıklama
    addProductBtn.addEventListener('click', () => {
        resetForm();
        modalTitle.textContent = 'Yeni Ürün Ekle';
        productModal.style.display = 'block';
    });
    
    // İptal butonuna tıklama
    cancelBtn.addEventListener('click', () => {
        productModal.style.display = 'none';
    });
    
    // Yenile butonuna tıklama
    refreshBtn.addEventListener('click', () => {
        fetchProducts();
    });
    
    // Silme onay butonuna tıklama
    deleteConfirmBtn.addEventListener('click', () => {
        if (productToDelete) {
            deleteProduct(productToDelete);
        }
    });
    
    // Silme iptal butonuna tıklama
    deleteCancelBtn.addEventListener('click', () => {
        deleteModal.style.display = 'none';
    });
    
    // Ürün formunu gönderme
    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const productData = {
            title: productTitleInput.value,
            category: productCategoryInput.value,
            store: productStoreInput.value,
            currentPrice: parseFloat(productCurrentPriceInput.value),
            originalPrice: parseFloat(productOriginalPriceInput.value),
            image: productImageInput.value,
            link: productLinkInput.value,
            discount: calculateDiscount(productCurrentPriceInput.value, productOriginalPriceInput.value)
        };
        
        if (productIdInput.value) {
            // Ürün güncelleme
            productData.id = productIdInput.value;
            updateProduct(productData);
        } else {
            // Yeni ürün ekleme
            addProduct(productData);
        }
    });
    
    // Arama ve filtreleme
    searchInput.addEventListener('input', filterProducts);
    categoryFilter.addEventListener('change', filterProducts);
    storeFilter.addEventListener('change', filterProducts);
    discountFilter.addEventListener('change', filterProducts);
    
    // Sayfalama butonları
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderProducts();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderProducts();
        }
    });
    
    // WebSocket olaylarını dinle
    socket.on('product_added', (product) => {
        fetchProducts();
    });
    
    socket.on('product_updated', (product) => {
        fetchProducts();
    });
    
    socket.on('product_deleted', (productId) => {
        fetchProducts();
    });
    
    socket.on('price_update', (data) => {
        fetchProducts();
    });
    
    // Ürünleri getir
    async function fetchProducts() {
        try {
            const response = await fetch('/api/products');
            const products = await response.json();
            
            currentProducts = products;
            updateStats(products);
            filterProducts();
            
        } catch (error) {
            console.error('Ürünler yüklenirken hata:', error);
            productList.innerHTML = '<tr><td colspan="9" class="empty-table">Ürünler yüklenirken bir hata oluştu.</td></tr>';
        }
    }
    
    // İstatistikleri güncelle
    function updateStats(products) {
        if (!products || products.length === 0) {
            totalProductsEl.textContent = '0';
            avgDiscountEl.textContent = '%0';
            activeStoresEl.textContent = '0';
            lastUpdateEl.textContent = '-';
            return;
        }
        
        // Toplam ürün sayısı
        totalProductsEl.textContent = products.length;
        
        // Ortalama indirim
        const totalDiscount = products.reduce((sum, product) => sum + product.discount, 0);
        const avgDiscount = Math.round(totalDiscount / products.length);
        avgDiscountEl.textContent = `%${avgDiscount}`;
        
        // Aktif mağaza sayısı
        const stores = new Set(products.map(product => product.store));
        activeStoresEl.textContent = stores.size;
        
        // Son güncelleme zamanı
        const lastUpdate = new Date(Math.max(...products.map(product => new Date(product.lastUpdated || 0))));
        lastUpdateEl.textContent = isNaN(lastUpdate) ? '-' : formatDate(lastUpdate);
    }
    
    // Ürünleri filtrele
    function filterProducts() {
        const searchTerm = searchInput.value.toLowerCase();
        const categoryValue = categoryFilter.value;
        const storeValue = storeFilter.value;
        const discountValue = parseInt(discountFilter.value) || 0;
        
        const filteredProducts = currentProducts.filter(product => {
            // Arama filtresi
            const matchesSearch = product.title.toLowerCase().includes(searchTerm);
            
            // Kategori filtresi
            const matchesCategory = !categoryValue || product.category === categoryValue;
            
            // Mağaza filtresi
            const matchesStore = !storeValue || product.store === storeValue;
            
            // İndirim filtresi
            const matchesDiscount = product.discount >= discountValue;
            
            return matchesSearch && matchesCategory && matchesStore && matchesDiscount;
        });
        
        // Sayfalama hesapla
        totalPages = Math.ceil(filteredProducts.length / productsPerPage);
        if (currentPage > totalPages) {
            currentPage = totalPages || 1;
        }
        
        // Sayfalama bilgisini güncelle
        pageInfo.textContent = `Sayfa ${currentPage} / ${totalPages}`;
        
        // Sayfalama butonlarını güncelle
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
        
        // Ürünleri göster
        renderProductsFromFiltered(filteredProducts);
    }
    
    // Filtrelenmiş ürünleri göster
    function renderProductsFromFiltered(filteredProducts) {
        const startIndex = (currentPage - 1) * productsPerPage;
        const endIndex = startIndex + productsPerPage;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
        
        renderProductList(paginatedProducts);
    }
    
    // Ürünleri göster
    function renderProducts() {
        filterProducts();
    }
    
    // Ürün listesini oluştur
    function renderProductList(products) {
        if (!products || products.length === 0) {
            productList.innerHTML = '<tr><td colspan="9" class="empty-table">Ürün bulunamadı.</td></tr>';
            return;
        }
        
        productList.innerHTML = '';
        
        products.forEach(product => {
            const row = document.createElement('tr');
            
            // Fiyat formatı
            const formatPrice = (price) => {
                return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            };
            
            // Tarih formatı
            const lastUpdated = product.lastUpdated ? formatDate(new Date(product.lastUpdated)) : '-';
            
            row.innerHTML = `
                <td>${product._id.substring(0, 8)}...</td>
                <td class="product-name">
                    <div class="product-info">
                        <img src="${product.image}" alt="${product.title}" class="product-thumbnail">
                        <span>${product.title}</span>
                    </div>
                </td>
                <td>${product.category}</td>
                <td>${product.store}</td>
                <td>${formatPrice(product.currentPrice)} TL</td>
                <td>${formatPrice(product.originalPrice)} TL</td>
                <td class="discount">%${product.discount}</td>
                <td>${lastUpdated}</td>
                <td class="actions">
                    <button class="btn-icon edit-btn" data-id="${product._id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon delete-btn" data-id="${product._id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            
            productList.appendChild(row);
        });
        
        // Düzenleme butonlarına olay dinleyicileri ekle
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', () => {
                const productId = button.getAttribute('data-id');
                editProduct(productId);
            });
        });
        
        // Silme butonlarına olay dinleyicileri ekle
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', () => {
                const productId = button.getAttribute('data-id');
                confirmDelete(productId);
            });
        });
    }
    
    // Ürün düzenleme
    function editProduct(productId) {
        const product = currentProducts.find(p => p._id === productId);
        
        if (product) {
            productIdInput.value = product._id;
            productTitleInput.value = product.title;
            productCategoryInput.value = product.category;
            productStoreInput.value = product.store;
            productCurrentPriceInput.value = product.currentPrice;
            productOriginalPriceInput.value = product.originalPrice;
            productImageInput.value = product.image;
            productLinkInput.value = product.link;
            
            modalTitle.textContent = 'Ürün Düzenle';
            productModal.style.display = 'block';
        }
    }
    
    // Silme onayı
    function confirmDelete(productId) {
        productToDelete = productId;
        deleteModal.style.display = 'block';
    }
    
    // Yeni ürün ekle
    async function addProduct(productData) {
        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            
            if (response.ok) {
                productModal.style.display = 'none';
                resetForm();
                fetchProducts();
            } else {
                const error = await response.json();
                alert(`Ürün eklenirken hata: ${error.message}`);
            }
        } catch (error) {
            console.error('Ürün eklenirken hata:', error);
            alert('Ürün eklenirken bir hata oluştu.');
        }
    }
    
    // Ürün güncelle
    async function updateProduct(productData) {
        try {
            const response = await fetch(`/api/products/${productData.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            
            if (response.ok) {
                productModal.style.display = 'none';
                resetForm();
                fetchProducts();
            } else {
                const error = await response.json();
                alert(`Ürün güncellenirken hata: ${error.message}`);
            }
        } catch (error) {
            console.error('Ürün güncellenirken hata:', error);
            alert('Ürün güncellenirken bir hata oluştu.');
        }
    }
    
    // Ürün sil
    async function deleteProduct(productId) {
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                deleteModal.style.display = 'none';
                fetchProducts();
            } else {
                const error = await response.json();
                alert(`Ürün silinirken hata: ${error.message}`);
            }
        } catch (error) {
            console.error('Ürün silinirken hata:', error);
            alert('Ürün silinirken bir hata oluştu.');
        }
    }
    
    // Formu sıfırla
    function resetForm() {
        productForm.reset();
        productIdInput.value = '';
    }
    
    // İndirim oranı hesapla
    function calculateDiscount(currentPrice, originalPrice) {
        currentPrice = parseFloat(currentPrice);
        originalPrice = parseFloat(originalPrice);
        
        if (originalPrice <= 0 || currentPrice >= originalPrice) {
            return 0;
        }
        
        return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }
    
    // Tarih formatla
    function formatDate(date) {
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Sayfa yüklendiğinde ürünleri getir
    fetchProducts();
}); 