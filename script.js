import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
//  SUPABASE CREDENTIALS
// ============================================================
const SUPABASE_URL = 'https://bbbxgvmlfcdumykiquqt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYnhndm1sZmNkdW15a2lxdXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzIzNzEsImV4cCI6MjA5NDg0ODM3MX0.BKQdvUK4j_zjclMUspN1KuxcpWWTQv0dOdgrLvbPqyg'
// ============================================================

const OWNER_WHATSAPP = '2348068510863'

let supabase = null
try {
  if (SUPABASE_URL && !SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
    SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY')) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  } else {
    console.warn('DFC: Supabase credentials not set.')
  }
} catch (e) {
  console.error('DFC: Supabase init failed:', e)
}

let products = []
let comments = []
let currentSearchTerm = ''

// ========== LOAD PRODUCTS ==========
async function loadProducts() {
  const grid = document.getElementById('productsGrid')
  if (!supabase) {
    if (grid) grid.innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#d4af37;">⚙️ Connect Supabase to display products.<br><small style="color:#888;font-size:12px">Add your credentials to script.js</small></div>`
    return
  }
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    products = data || []
    renderProducts()
  } catch (err) {
    console.error('Error loading products:', err)
    if (grid) grid.innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:60px;">⚠️ Unable to load products. Check Supabase connection.</div>`
  }
}

// ========== LOAD COMMENTS ==========
async function loadComments() {
  if (!supabase) return
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    comments = data || []
    renderComments()
  } catch (err) {
    console.error('Error loading comments:', err)
  }
}

// ========== RENDER PRODUCTS ==========
function renderProducts() {
  const container = document.getElementById('productsGrid')
  if (!container) return
  let filtered = products
  if (currentSearchTerm.trim()) {
    const term = currentSearchTerm.toLowerCase()
    filtered = products.filter(p =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.details || '').toLowerCase().includes(term)
    )
  }
  if (!filtered.length) {
    container.innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#6a5c48;">✨ No products found. ✨</div>`
    return
  }
  container.innerHTML = filtered.map(prod => `
    <div class="product-card" data-id="${prod.id}">
      <div class="product-image-wrapper">
        <img class="product-img"
          src="${escapeHtml(prod.image_url || prod.imageUrl || '')}"
          alt="${escapeHtml(prod.name)}"
          onerror="this.src='https://placehold.co/400x500/111111/d4af37?text=LUXE'">
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

  container.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      const product = products.find(p => String(p.id) === String(card.dataset.id))
      if (product) openProductModal(product)
    })
  })
}

// ========== RENDER COMMENTS ==========
function renderComments() {
  const container = document.getElementById('commentsList')
  if (!container) return
  if (!comments.length) {
    container.innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#6a5c48;">No reviews yet. Be the first to share!</div>`
    return
  }
  container.innerHTML = comments.map((c, index) => {
    const isFeatured = index === 0
    return `
    <div class="comment-card ${isFeatured ? 'featured' : ''}">
      ${isFeatured ? '<div class="review-quote">❝</div>' : ''}
      ${isFeatured ? `<div class="rating-stars" style="margin-bottom:8px;">
        <i class="fas fa-star"></i>
        <i class="fas fa-star"></i>
        <i class="fas fa-star"></i>
        <i class="fas fa-star"></i>
        <i class="fas fa-star"></i>
      </div>` : ''}
      <div class="comment-text">${escapeHtml(c.text)}</div>
      <div class="comment-author">
        <div class="comment-initials">${escapeHtml((c.name || 'U')[0].toUpperCase())}</div>
        <div>
          <div class="comment-name">${escapeHtml(c.name || 'Anonymous')}</div>
          <div class="comment-date">${c.date || 'recent'}</div>
        </div>
      </div>
    </div>
  `}).join('')
}

// ========== ADD COMMENT ==========
async function addComment(name, text) {
  if (!name.trim() || !text.trim()) { alert('Please enter your name and comment.'); return }
  if (!supabase) { alert('Supabase not connected.'); return }
  const { error } = await supabase.from('comments').insert([{
    name: name.trim(),
    text: text.trim(),
    date: new Date().toLocaleDateString(),
    created_at: new Date().toISOString()
  }])
  if (error) { console.error(error); alert('Could not post comment.') } else {
    await loadComments()
    document.getElementById('commentName').value = ''
    document.getElementById('commentMsg').value = ''
  }
}

// ========== SUBSCRIBE ==========
async function confirmSignup() {
  const emailInput = document.getElementById('signupEmail')
  const email = emailInput ? emailInput.value.trim() : ''
  if (!email || !email.includes('@')) { alert('Please enter a valid email.'); return }
  if (!supabase) { alert('Supabase not connected.'); return }
  const { error } = await supabase.from('subscribers').insert([{ email, created_at: new Date().toISOString() }])
  if (error && error.code !== '23505') alert('Subscription failed: ' + error.message)
  else alert('Thank you for subscribing! ✨')
  closeModal('signupModal')
  if (emailInput) emailInput.value = ''
}

// ========== MODALS ==========
let currentProduct = null

function openProductModal(product) {
  currentProduct = product
  const modal = document.getElementById('productModal')
  if (!modal) return
  document.getElementById('modalImage').src = product.image_url || product.imageUrl || ''
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

// ========== WHATSAPP ==========
function sendWhatsApp() {
  if (!currentProduct) return
  const msg =
    `Hi! I'm interested in *${currentProduct.name}* (Price: ${currentProduct.price}). Details: ${(currentProduct.details || '').substring(0, 120)}. Let's negotiate! ✨`
  window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank')
}

function bookAppointment() {
  window.open(`https://wa.me/${OWNER_WHATSAPP}?text=Hello!%20I'd%20like%20to%20book%20an%20appointment.`, '_blank')
}

// ========== SEARCH ==========
function setupSearch() {
  const input = document.getElementById('searchInput')
  if (input) {
    input.addEventListener('input', e => {
      currentSearchTerm = e.target.value
      renderProducts()
    })
  }
}

// ========== MOBILE MENU ==========
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

// ========== LOGO FROM SUPABASE ==========
async function loadLogo() {
  if (!supabase) return
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'logo_url')
      .single()
    if (data && data.value) {
      const img = document.getElementById('brandLogoImg')
      const txt = document.getElementById('brandLogoText')
      if (img) { img.src = data.value;
        img.style.display = 'block' }
      if (txt) txt.style.display = 'none'
    }
  } catch (e) {}
}

// ========== UTILITY ==========
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

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {

  // Set contact info
  const numEl = getById('whatsappNumberDisplay')
  if (numEl) numEl.innerText = '+234 806 851 0863'
  const linkEl = getById('directWhatsappLink')
  if (linkEl) linkEl.href =
    `https://wa.me/${OWNER_WHATSAPP}?text=Hello!%20I'm%20interested%20in%20your%20fashion%20collection%20at%20DFC!`

  setupSearch()
  setupMobileMenu()

  on('signupBtn', 'click', e => { e.preventDefault();
    openSignupModal() })
  on('mobileSignupBtn', 'click', e => { e.preventDefault();
    openSignupModal() })
  on('mobileBookBtn', 'click', e => { e.preventDefault();
    bookAppointment() })

  on('whatsappModalBtn', 'click', sendWhatsApp)
  const productModal = getById('productModal')
  if (productModal) {
    const closeBtn = productModal.querySelector('.modal-close')
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal('productModal'))
    window.addEventListener('click', e => { if (e.target === productModal) closeModal('productModal') })
  }

  on('closeSignupModal', 'click', () => closeModal('signupModal'))
  on('confirmSignupBtn', 'click', confirmSignup)
  const signupModal = getById('signupModal')
  if (signupModal) {
    window.addEventListener('click', e => { if (e.target === signupModal) closeModal('signupModal') })
  }

  on('submitCommentBtn', 'click', () => {
    const name = (getById('commentName') || {}).value || ''
    const msg = (getById('commentMsg') || {}).value || ''
    addComment(name, msg)
  })

  await loadLogo()
  await loadProducts()
  await loadComments()
})
