document.addEventListener('DOMContentLoaded', () => {
    // DOM Elementleri
    const productsTable = document.getElementById('products-list');
    const addProductBtn = document.getElementById('add-product-btn');
    const productModal = document.getElementById('product-modal');
    const closeModal = document.querySelector('.close');
    const productForm = document.getElementById('product-form');
    const modalTitle = document.getElementById('modal-title');
    const searchInput = document.getElementById('search-products');
    const categoryFilter = document.getElementById('category-filter');
    const storeFilter = document.getElementById('store-filter');
    const manualScrapeBtn = document.getElementById('manual-scrape');
    
    // Form Alanları
    const productIdInput = document.getElementById('product-id');
    const titleInput = document.getElementById('product-title');
    const currentPriceInput = document.getElementById('product-current-price');
    const originalPriceInput = document.getElementById('product-original-price');
    const categorySelect = document.getElementById('product-category');
    const storeSelect = document.getElementById('product-store');
    const imageInput = document.getElementById('product-image');
    const linkInput = document.getElementById('product-link');
    
    // Ürünleri API'den çek ve tabloya ekle
    async function fetchAndDisplayProducts() {
        try {
            const response = await fetch('http://localhost:3000/api/products');
            const products = await response.json();
            displayProducts(products);
        } catch (error) {
            console.error('Ürün listesi yüklenirken hata:', error);
            alert('Ürünler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        }
    }
    
    // Ürünleri tablo olarak göster
    function displayProducts(products) {
        productsTable.innerHTML = '';
        
        if (products.length === 0) {
            productsTable.innerHTML = '<tr><td colspan="7" style="text-align: center;">Ürün bulunamadı</td></tr>';
            return;
        }
        
        products.forEach(product => {
            const row = document.createElement('tr');
            
            // Fiyat formatı
            const formatPrice = (price) => {
                return price.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL';
            };
            
            // Tarih formatı
            const formatDate = (dateString) => {
                const date = new Date(dateString);
                return date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            };
            
            row.innerHTML = `
                <td>
                    <div class="product-info">
                        <img src="${product.image}" alt="${product.title}" class="product-image">
                        <span>${product.title}</span>
                    </div>
                </td>
                <td>${formatPrice(product.currentPrice)}</td>
                <td>%${product.discount}</td>
                <td>${product.category}</td>
                <td>${product.store}</td>
                <td>${formatDate(product.lastUpdated)}</td>
                <td>
                    <div class="product-actions">
                        <button class="btn edit-btn" data-id="${product._id}"><i class="fas fa-edit"></i></button>
                        <button class="btn danger-btn" data-id="${product._id}"><i class="fas fa-trash"></i></button>
                        <a href="${product.link}" target="_blank" class="btn view-btn"><i class="fas fa-external-link-alt"></i></a>
                    </div>
                </td>
            `;
            
            // Düzenleme butonu
            row.querySelector('.edit-btn').addEventListener('click', () => {
                openEditModal(product);
            });
            
            // Silme butonu
            row.querySelector('.danger-btn').addEventListener('click', () => {
                if (confirm(`"${product.title}" ürününü silmek istediğinizden emin misiniz?`)) {
                    deleteProduct(product._id);
                }
            });
            
            productsTable.appendChild(row);
        });
    }
    
    // Ürün ekle/düzenle modalını aç
    function openModal(isEdit = false) {
        productModal.style.display = 'block';
        modalTitle.textContent = isEdit ? 'Ürün Düzenle' : 'Yeni Ürün Ekle';
        
        if (!isEdit) {
            productForm.reset();
            productIdInput.value = '';
        }
    }
    
    // Düzenleme modalını aç ve form alanlarını doldur
    function openEditModal(product) {
        openModal(true);
        
        productIdInput.value = product._id;
        titleInput.value = product.title;
        currentPriceInput.value = product.currentPrice;
        originalPriceInput.value = product.originalPrice;
        categorySelect.value = product.category;
        storeSelect.value = product.store;
        imageInput.value = product.image;
        linkInput.value = product.link;
    }
    
    // Modal kapat
    function closeModalFunc() {
        productModal.style.display = 'none';
    }
    
    // Ürün ekle veya güncelle
    async function saveProduct(formData) {
        const productId = productIdInput.value;
        const isEditing = !!productId;
        
        try {
            const url = isEditing 
                ? `http://localhost:3000/api/products/${productId}` 
                : 'http://localhost:3000/api/products';
            
            const method = isEditing ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error('Sunucu hatası');
            }
            
            alert(isEditing ? 'Ürün başarıyla güncellendi!' : 'Yeni ürün başarıyla eklendi!');
            closeModalFunc();
            fetchAndDisplayProducts();
        } catch (error) {
            console.error('Ürün kaydedilirken hata:', error);
            alert('Ürün kaydedilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        }
    }
    
    // Ürün sil
    async function deleteProduct(productId) {
        try {
            const response = await fetch(`http://localhost:3000/api/products/${productId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Sunucu hatası');
            }
            
            alert('Ürün başarıyla silindi!');
            fetchAndDisplayProducts();
        } catch (error) {
            console.error('Ürün silinirken hata:', error);
            alert('Ürün silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        }
    }
    
    // Ürün linkinden otomatik fiyat çek
    async function scrapePriceFromLink() {
        const productLink = linkInput.value;
        
        if (!productLink) {
            alert('Fiyat çekmek için önce ürün linkini girin!');
            return;
        }
        
        try {
            const response = await fetch('http://localhost:3000/api/scrape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: productLink })
            });
            
            if (!response.ok) {
                throw new Error('Scraping hatası');
            }
            
            const data = await response.json();
            
            if (data.price) {
                currentPriceInput.value = data.price;
                
                if (data.originalPrice) {
                    originalPriceInput.value = data.originalPrice;
                }
                
                alert('Fiyat bilgisi başarıyla çekildi!');
            } else {
                alert('Fiyat bilgisi bulunamadı. Lütfen manuel olarak girin.');
            }
        } catch (error) {
            console.error('Fiyat çekilirken hata:', error);
            alert('Fiyat çekilirken bir hata oluştu. Lütfen manuel olarak girin.');
        }
    }
    
    // Filtreleme ve Arama
    function filterProducts() {
        const searchTerm = searchInput.value.toLowerCase();
        const category = categoryFilter.value;
        const store = storeFilter.value;
        
        let url = 'http://localhost:3000/api/products';
        const queryParams = [];
        
        if (category && category !== 'all') {
            queryParams.push(`category=${category}`);
        }
        
        if (store && store !== 'all') {
            queryParams.push(`store=${store}`);
        }
        
        if (searchTerm) {
            queryParams.push(`search=${searchTerm}`);
        }
        
        if (queryParams.length > 0) {
            url += '?' + queryParams.join('&');
        }
        
        fetch(url)
            .then(response => response.json())
            .then(products => displayProducts(products))
            .catch(error => console.error('Filtreleme hatası:', error));
    }
    
    // Event Listeners
    addProductBtn.addEventListener('click', () => openModal());
    closeModal.addEventListener('click', closeModalFunc);
    
    window.addEventListener('click', (e) => {
        if (e.target === productModal) {
            closeModalFunc();
        }
    });
    
    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Form verilerini topla
        const formData = {
            title: titleInput.value,
            currentPrice: Number(currentPriceInput.value),
            originalPrice: Number(originalPriceInput.value),
            category: categorySelect.value,
            store: storeSelect.value,
            image: imageInput.value,
            link: linkInput.value,
            discount: Math.round(((Number(originalPriceInput.value) - Number(currentPriceInput.value)) / Number(originalPriceInput.value)) * 100),
            time: 'Yeni eklendi',
            lastUpdated: new Date()
        };
        
        saveProduct(formData);
    });
    
    manualScrapeBtn.addEventListener('click', scrapePriceFromLink);
    
    searchInput.addEventListener('input', filterProducts);
    categoryFilter.addEventListener('change', filterProducts);
    storeFilter.addEventListener('change', filterProducts);
    
    // İlk yükleme
    fetchAndDisplayProducts();
}); 