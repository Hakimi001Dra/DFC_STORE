import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
//  SUPABASE CREDENTIALS - VERIFY THESE ARE CORRECT
// ============================================================
const SUPABASE_URL = 'https://bbbxgvmlfcdumykiquqt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYnhndm1sZmNkdW15a2lxdXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzIzNzEsImV4cCI6MjA5NDg0ODM3MX0.BKQdvUK4j_zjclMUspN1KuxcpWWTQv0dOdgrLvbPqyg'
// ============================================================

const OWNER_WHATSAPP = '2348068510863'

// ============================================================
//  INITIALIZE SUPABASE CLIENT
// ============================================================
let supabase = null
let isSupabaseConnected = false

try {
  if (SUPABASE_URL && !SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
      SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY')) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'dfc-web-app',
        },
      },
    })
    isSupabaseConnected = true
    console.log('✅ Supabase connected successfully')
  } else {
    console.warn('⚠️ Supabase credentials not set. Please update SUPABASE_URL and SUPABASE_ANON_KEY')
  }
} catch (e) {
  console.error('❌ Supabase init failed:', e)
}

let products = []
let comments = []
let currentSearchTerm = ''

// ============================================================
//  LOAD PRODUCTS FROM SUPABASE
// ============================================================
async function loadProducts() {
  const grid = document.getElementById('productsGrid')
  if (!grid) return

  // Show loading state
  grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:60px;color:#d4af37;">
      <i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i>
      <p style="margin-top:12px;">Loading products...</p>
    </div>
  `

  if (!supabase || !isSupabaseConnected) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px;color:#ff8888;">
        <i class="fas fa-database" style="font-size:2rem;"></i>
        <p style="margin-top:12px;">⚠️ Database not connected.</p>
        <p style="color:#888;font-size:0.85rem;margin-top:8px;">Please check your Supabase credentials in script.js</p>
      </div>
    `
    return
  }

  try {
    console.log('🔄 Fetching products from Supabase...')
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Supabase error:', error)
      throw error
    }

    console.log(`✅ Loaded ${data?.length || 0} products`)
    products = data || []
    
    // If no products, show message
    if (products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px;color:#6a5c48;">
          <i class="fas fa-box-open" style="font-size:2.5rem;display:block;margin-bottom:12px;"></i>
          <p>No products available yet.</p>
          <p style="font-size:0.85rem;margin-top:4px;">Add products through the admin panel.</p>
        </div>
      `
      return
    }

    renderProducts()
  } catch (err) {
    console.error('❌ Error loading products:', err)
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px;color:#ff8888;">
        <i class="fas fa-exclamation-triangle" style="font-size:2rem;"></i>
        <p style="margin-top:12px;">⚠️ Failed to load products.</p>
        <p style="color:#888;font-size:0.85rem;margin-top:8px;">${err.message || 'Please check your database connection.'}</p>
      </div>
    `
  }
}

// ============================================================
//  LOAD COMMENTS FROM SUPABASE
// ============================================================
async function loadComments() {
  const container = document.getElementById('commentsList')
  if (!container) return

  // Show loading state
  container.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:40px;color:#d4af37;">
      <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;"></i>
      <p style="margin-top:8px;">Loading reviews...</p>
    </div>
  `

  if (!supabase || !isSupabaseConnected) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">
        <p>⚠️ Database not connected. Please check your credentials.</p>
      </div>
    `
    return
  }

  try {
    console.log('🔄 Fetching comments from Supabase...')
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('❌ Supabase error:', error)
      throw error
    }

    console.log(`✅ Loaded ${data?.length || 0} comments`)
    comments = data || []
    renderComments()
  } catch (err) {
    console.error('❌ Error loading comments:', err)
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:#ff8888;">
        <p>⚠️ Failed to load reviews.</p>
        <p style="color:#888;font-size:0.85rem;">${err.message || 'Please check your database connection.'}</p>
      </div>
    `
  }
}

// ============================================================
//  RENDER PRODUCTS
// ============================================================
function renderProducts() {
  const container = document.getElementById('productsGrid')
  if (!container) return

  let filtered = products
  if (currentSearchTerm.trim()) {
    const term = currentSearchTerm.toLowerCase().trim()
    filtered = products.filter(p =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.details || '').toLowerCase().includes(term)
    )
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px;color:#6a5c48;">
        <i class="fas fa-search" style="font-size:2rem;display:block;margin-bottom:12px;"></i>
        <p>No products found matching your search.</p>
      </div>
    `
    return
  }

  container.innerHTML = filtered.map(prod => `
    <div class="product-card" data-id="${prod.id}">
      <div class="product-image-wrapper">
        <img class="product-img"
          src="${escapeHtml(prod.image_url || prod.imageUrl || '')}"
          alt="${escapeHtml(prod.name)}"
          loading="lazy"
          onerror="this.src='https://placehold.co/400x500/111111/d4af37?text=DFC'">
        <div class="product-overlay">
          <button class="quick-view-btn" onclick="event.stopPropagation();openProductModalById('${prod.id}')">
            <i class="fas fa-eye"></i> Quick View
          </button>
        </div>
        <div class="product-badge">New</div>
      </div>
      <div class="product-info">
        <div class="product-name">${escapeHtml(prod.name)}</div>
        <div class="product-price">${escapeHtml(prod.price)}</div>
        <div class="product-desc-short">${escapeHtml((prod.details || '').substring(0, 70))}${(prod.details || '').length > 70 ? '...' : ''}</div>
      </div>
    </div>
  `).join('')

  // Add click listeners
  container.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      const product = products.find(p => String(p.id) === String(card.dataset.id))
      if (product) openProductModal(product)
    })
  })
}

// ============================================================
//  RENDER COMMENTS
// ============================================================
function renderComments() {
  const container = document.getElementById('commentsList')
  if (!container) return

  if (!comments.length) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:#6a5c48;">
        <i class="fas fa-comment-slash" style="font-size:2rem;display:block;margin-bottom:12px;"></i>
        <p>No reviews yet. Be the first to share your experience!</p>
      </div>
    `
    return
  }

  container.innerHTML = comments.map((c) => `
    <div class="comment-card">
      <div class="comment-text">${escapeHtml(c.text)}</div>
      <div class="comment-author">
        <div class="comment-initials">${escapeHtml((c.name || 'U')[0].toUpperCase())}</div>
        <div>
          <div class="comment-name">${escapeHtml(c.name || 'Anonymous')}</div>
          <div class="comment-date">${c.date || 'recent'}</div>
        </div>
      </div>
    </div>
  `).join('')
}

// ============================================================
//  ADD COMMENT
// ============================================================
async function addComment(name, text) {
  if (!name.trim() || !text.trim()) {
    alert('Please enter your name and comment.')
    return
  }

  if (!supabase || !isSupabaseConnected) {
    alert('Database not connected. Please try again later.')
    return
  }

  try {
    const { error } = await supabase.from('comments').insert([{
      name: name.trim(),
      text: text.trim(),
      date: new Date().toLocaleDateString(),
      created_at: new Date().toISOString()
    }])

    if (error) {
      console.error('❌ Error adding comment:', error)
      alert('Could not post comment. Please try again later.')
      return
    }

    console.log('✅ Comment added successfully')
    await loadComments()
    document.getElementById('commentName').value = ''
    document.getElementById('commentMsg').value = ''

  } catch (err) {
    console.error('❌ Error adding comment:', err)
    alert('Could not post comment. Please try again later.')
  }
}

// ============================================================
//  SUBSCRIBE
// ============================================================
async function confirmSignup() {
  const emailInput = document.getElementById('signupEmail')
  const email = emailInput ? emailInput.value.trim() : ''

  if (!email || !email.includes('@')) {
    alert('Please enter a valid email address.')
    return
  }

  if (!supabase || !isSupabaseConnected) {
    alert('Database not connected. Please try again later.')
    return
  }

  try {
    const { error } = await supabase
      .from('subscribers')
      .insert([{ 
        email: email.trim(), 
        created_at: new Date().toISOString() 
      }])

    if (error) {
      if (error.code === '23505') {
        alert('You are already subscribed! ✨')
      } else {
        throw error
      }
    } else {
      alert('Thank you for subscribing! ✨')
    }

    closeModal('signupModal')
    if (emailInput) emailInput.value = ''

  } catch (err) {
    console.error('❌ Error subscribing:', err)
    alert('Subscription failed. Please try again later.')
  }
}

// ============================================================
//  MODALS
// ============================================================
let currentProduct = null

function openProductModal(product) {
  currentProduct = product
  const modal = document.getElementById('productModal')
  if (!modal) return
  
  document.getElementById('modalImage').src = product.image_url || product.imageUrl || 'https://placehold.co/400x500/111111/d4af37?text=DFC'
  document.getElementById('modalName').innerText = product.name || ''
  document.getElementById('modalPrice').innerText = product.price || ''
  document.getElementById('modalDetails').innerText = product.details || ''
  modal.style.display = 'flex'
}

function openProductModalById(id) {
  const product = products.find(p => String(p.id) === String(id))
  if (product) openProductModal(product)
}

window.openProductModalById = openProductModalById

function openSignupModal() {
  const modal = document.getElementById('signupModal')
  if (modal) modal.style.display = 'flex'
}

function closeModal(id) {
  const el = document.getElementById(id)
  if (el) el.style.display = 'none'
}

// ============================================================
//  WHATSAPP
// ============================================================
function sendWhatsApp() {
  if (!currentProduct) return
  const msg = `Hi! I'm interested in *${currentProduct.name}* (Price: ${currentProduct.price}). Details: ${(currentProduct.details || '').substring(0, 120)}. Let's negotiate! ✨`
  window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank')
}

function bookAppointment() {
  window.open(`https://wa.me/${OWNER_WHATSAPP}?text=Hello!%20I'd%20like%20to%20book%20an%20appointment.`, '_blank')
}

// ============================================================
//  SEARCH
// ============================================================
function setupSearch() {
  const input = document.getElementById('searchInput')
  if (input) {
    input.addEventListener('input', e => {
      currentSearchTerm = e.target.value
      renderProducts()
    })
  }
}

// ============================================================
//  MOBILE MENU
// ============================================================
function setupMobileMenu() {
  const hamburger = document.getElementById('hamburgerMenu')
  const mobileNav = document.getElementById('mobileNav')
  if (!hamburger || !mobileNav) return

  hamburger.addEventListener('click', () => {
    mobileNav.classList.toggle('open')
    hamburger.querySelector('i').className = mobileNav.classList.contains('open') ?
      'fas fa-times' : 'fas fa-bars'
  })

  mobileNav.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      mobileNav.classList.remove('open')
      hamburger.querySelector('i').className = 'fas fa-bars'
    })
  )
}

// ============================================================
//  LOGO FROM SUPABASE
// ============================================================
async function loadLogo() {
  if (!supabase || !isSupabaseConnected) return

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'logo_url')
      .single()

    if (error) {
      console.log('ℹ️ No logo found in settings')
      return
    }

    if (data && data.value) {
      const img = document.getElementById('brandLogoImg')
      const txt = document.getElementById('brandLogoText')
      if (img) { 
        img.src = data.value
        img.style.display = 'block'
      }
      if (txt) txt.style.display = 'none'
      console.log('✅ Logo loaded successfully')
    }
  } catch (err) {
    console.log('ℹ️ Logo not configured yet')
  }
}

// ============================================================
//  UTILITY
// ============================================================
function escapeHtml(str) {
  if (str == null) return ''
  return String(str).replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]
  )
}

function getById(id) { return document.getElementById(id) }

function on(id, event, fn) {
  const el = getById(id)
  if (el) el.addEventListener(event, fn)
}

// ============================================================
//  CHECK DATABASE CONNECTION - TEST FUNCTION
// ============================================================
async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...')
  
  if (!supabase || !isSupabaseConnected) {
    console.error('❌ Supabase not initialized')
    return false
  }

  try {
    // Try to fetch a single product to test connection
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ Database connection test failed:', error)
      return false
    }

    console.log('✅ Database connection successful!')
    console.log(`ℹ️ Found ${data?.length || 0} products in database`)
    return true
  } catch (err) {
    console.error('❌ Database connection test failed:', err)
    return false
  }
}

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 DFC Website Initializing...')

  // Set contact info
  const numEl = getById('whatsappNumberDisplay')
  if (numEl) numEl.innerText = '+234 806 851 0863'

  const linkEl = getById('directWhatsappLink')
  if (linkEl) {
    linkEl.href = `https://wa.me/${OWNER_WHATSAPP}?text=Hello!%20I'm%20interested%20in%20your%20fashion%20collection%20at%20DFC!`
  }

  // Setup UI
  setupSearch()
  setupMobileMenu()

  // Event listeners
  on('signupBtn', 'click', e => { e.preventDefault(); openSignupModal() })
  on('mobileSignupBtn', 'click', e => { e.preventDefault(); openSignupModal() })
  on('mobileBookBtn', 'click', e => { e.preventDefault(); bookAppointment() })
  on('whatsappModalBtn', 'click', sendWhatsApp)

  // Product modal close
  const productModal = getById('productModal')
  if (productModal) {
    const closeBtn = productModal.querySelector('.modal-close')
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal('productModal'))
    window.addEventListener('click', e => { if (e.target === productModal) closeModal('productModal') })
  }

  // Signup modal close
  on('closeSignupModal', 'click', () => closeModal('signupModal'))
  on('confirmSignupBtn', 'click', confirmSignup)

  const signupModal = getById('signupModal')
  if (signupModal) {
    window.addEventListener('click', e => { if (e.target === signupModal) closeModal('signupModal') })
  }

  // Submit comment
  on('submitCommentBtn', 'click', () => {
    const name = (getById('commentName') || {}).value || ''
    const msg = (getById('commentMsg') || {}).value || ''
    addComment(name, msg)
  })

  // Test database connection first
  const dbConnected = await testDatabaseConnection()
  
  if (dbConnected) {
    // Load data from Supabase
    await loadLogo()
    await loadProducts()
    await loadComments()
  } else {
    // Show error message in the UI
    const grid = document.getElementById('productsGrid')
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px;color:#ff8888;">
          <i class="fas fa-database" style="font-size:2.5rem;display:block;margin-bottom:16px;"></i>
          <h3 style="margin-bottom:8px;">Database Connection Error</h3>
          <p>Unable to connect to Supabase.</p>
          <p style="color:#888;font-size:0.85rem;margin-top:8px;">
            Please verify your SUPABASE_URL and SUPABASE_ANON_KEY in script.js
          </p>
        </div>
      `
    }
  }

  console.log('✅ DFC Website Initialized')
})
