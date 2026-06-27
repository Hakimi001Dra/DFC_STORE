import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
//  SUPABASE CREDENTIALS
// ============================================================
const SUPABASE_URL = 'https://bbbxgvmlfcdumykiquqt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYnhndm1sZmNkdW15a2lxdXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzIzNzEsImV4cCI6MjA5NDg0ODM3MX0.BKQdvUK4j_zjclMUspN1KuxcpWWTQv0dOdgrLvbPqyg'
// ============================================================

const OWNER_WHATSAPP = '2348068510863'

let supabase = null
let isSupabaseConnected = false

try {
  if (SUPABASE_URL && !SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
      SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY')) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
    isSupabaseConnected = true
    console.log('✅ Supabase connected')
  }
} catch (e) {
  console.error('❌ Supabase init failed:', e)
}

let products = []
let comments = []
let currentSearchTerm = ''

// ============================================================
//  LOAD LOGO - CIRCULAR
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
      console.log('ℹ️ No logo found - using text logo')
      return
    }

    if (data && data.value) {
      const img = document.getElementById('brandLogoImg')
      const txt = document.getElementById('brandLogoText')
      
      if (img) {
        img.src = data.value
        img.style.display = 'block'
        img.style.width = '100%'
        img.style.height = '100%'
        img.style.objectFit = 'cover'
        img.style.borderRadius = '50%'
        img.style.border = 'none'
        img.style.outline = 'none'
        img.style.background = 'transparent'
        img.classList.add('visible')
      }
      
      if (txt) txt.style.display = 'none'
      
      console.log('✅ Circular logo loaded')
    }
  } catch (err) {
    console.log('ℹ️ Logo not configured')
  }
}

// ============================================================
//  LOAD PRODUCTS
// ============================================================
async function loadProducts() {
  const grid = document.getElementById('productsGrid')
  if (!grid) return

  grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:40px;color:#d4af37;">
      <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;"></i>
      <p style="margin-top:8px;">Loading products...</p>
    </div>
  `

  if (!supabase || !isSupabaseConnected) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:#ff8888;">
        <p>⚠️ Database not connected.</p>
      </div>
    `
    return
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    products = data || []
    console.log(`✅ Loaded ${products.length} products`)
    
    if (products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:40px;color:#6a5c48;">
          <p>No products available yet.</p>
        </div>
      `
      return
    }

    renderProducts()
  } catch (err) {
    console.error('❌ Error loading products:', err)
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:#ff8888;">
        <p>⚠️ Failed to load products.</p>
      </div>
    `
  }
}

// ============================================================
//  LOAD COMMENTS
// ============================================================
async function loadComments() {
  const container = document.getElementById('commentsList')
  if (!container) return

  container.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:20px;color:#d4af37;">
      <i class="fas fa-spinner fa-spin"></i> Loading reviews...
    </div>
  `

  if (!supabase || !isSupabaseConnected) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:20px;color:#888;">
        <p>⚠️ Database not connected.</p>
      </div>
    `
    return
  }

  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    comments = data || []
    console.log(`✅ Loaded ${comments.length} comments`)
    renderComments()
  } catch (err) {
    console.error('❌ Error loading comments:', err)
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:20px;color:#ff8888;">
        <p>⚠️ Failed to load reviews.</p>
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
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:#6a5c48;">
        <p>No products found.</p>
      </div>
    `
    return
  }

  container.innerHTML = filtered.map(prod => `
    <div class="product-card" data-id="${prod.id}">
      <div class="product-image-wrapper">
        <img class="product-img"
          src="${prod.image_url || prod.imageUrl || 'https://placehold.co/400x500/111111/d4af37?text=DFC'}"
          alt="${prod.name || 'Product'}"
          loading="lazy"
          onerror="this.src='https://placehold.co/400x500/111111/d4af37?text=DFC'">
        <div class="product-overlay">
          <button class="quick-view-btn" onclick="event.stopPropagation();openProductModalById('${prod.id}')">
            <i class="fas fa-eye"></i> View
          </button>
        </div>
        <div class="product-badge">New</div>
      </div>
      <div class="product-info">
        <div class="product-name">${prod.name || 'Unnamed'}</div>
        <div class="product-price">${prod.price || '₦0'}</div>
        <div class="product-desc-short">${(prod.details || '').substring(0, 70)}</div>
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

// ============================================================
//  RENDER COMMENTS
// ============================================================
function renderComments() {
  const container = document.getElementById('commentsList')
  if (!container) return

  if (!comments.length) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:20px;color:#6a5c48;">
        <p>No reviews yet. Be the first!</p>
      </div>
    `
    return
  }

  container.innerHTML = comments.map(c => `
    <div class="comment-card">
      <div class="comment-text">${c.text || ''}</div>
      <div class="comment-author">
        <div class="comment-initials">${(c.name || 'U')[0].toUpperCase()}</div>
        <div>
          <div class="comment-name">${c.name || 'Anonymous'}</div>
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
    alert('Database not connected.')
    return
  }

  try {
    const { error } = await supabase.from('comments').insert([{
      name: name.trim(),
      text: text.trim(),
      date: new Date().toLocaleDateString(),
      created_at: new Date().toISOString()
    }])

    if (error) throw error

    await loadComments()
    document.getElementById('commentName').value = ''
    document.getElementById('commentMsg').value = ''
  } catch (err) {
    console.error('Error adding comment:', err)
    alert('Could not post comment.')
  }
}

// ============================================================
//  SUBSCRIBE
// ============================================================
async function confirmSignup() {
  const emailInput = document.getElementById('signupEmail')
  const email = emailInput ? emailInput.value.trim() : ''

  if (!email || !email.includes('@')) {
    alert('Please enter a valid email.')
    return
  }

  if (!supabase || !isSupabaseConnected) {
    alert('Database not connected.')
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
        alert('Already subscribed! ✨')
      } else {
        throw error
      }
    } else {
      alert('Thank you for subscribing! ✨')
    }

    document.getElementById('signupModal').style.display = 'none'
    if (emailInput) emailInput.value = ''
  } catch (err) {
    console.error('Error subscribing:', err)
    alert('Subscription failed.')
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
  
  const img = document.getElementById('modalImage')
  img.src = product.image_url || product.imageUrl || 'https://placehold.co/400x500/111111/d4af37?text=DFC'
  img.style.objectFit = 'contain'
  img.style.width = '100%'
  img.style.height = 'auto'
  img.style.maxHeight = '55vh'
  
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

function sendWhatsApp() {
  if (!currentProduct) return
  const msg = `Hi! I'm interested in *${currentProduct.name}* (${currentProduct.price}). Let's negotiate! ✨`
  window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank')
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
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 DFC Website Initializing...')

  setupSearch()

  // Signup
  document.getElementById('signupBtn')?.addEventListener('click', e => {
    e.preventDefault()
    document.getElementById('signupModal').style.display = 'flex'
  })

  document.getElementById('mobileSignupBtn')?.addEventListener('click', e => {
    e.preventDefault()
    document.getElementById('signupModal').style.display = 'flex'
  })

  document.getElementById('confirmSignupBtn')?.addEventListener('click', confirmSignup)

  // WhatsApp
  document.getElementById('whatsappModalBtn')?.addEventListener('click', sendWhatsApp)

  // Submit comment
  document.getElementById('submitCommentBtn')?.addEventListener('click', () => {
    const name = document.getElementById('commentName')?.value || ''
    const msg = document.getElementById('commentMsg')?.value || ''
    addComment(name, msg)
  })

  // Load logo FIRST
  await loadLogo()
  
  // Then load data
  await loadProducts()
  await loadComments()

  console.log('✅ DFC Website Ready')
})
