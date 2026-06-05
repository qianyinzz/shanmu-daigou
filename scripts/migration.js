const http = require('http');

const API_BASE = 'http://localhost:5000/api';

const DEFAULT_CATEGORIES = [
  { id: 'hot', name: '推荐爆款', icon: '🔥', sort_order: 1 },
  { id: 'dragon_boat', name: '端午礼品', icon: '🎁', sort_order: 2 },
  { id: 'snacks', name: '休闲零食', icon: '🍪', sort_order: 3 },
  { id: 'bakery', name: '面包烘焙', icon: '🍞', sort_order: 4 },
  { id: 'fresh', name: '生鲜水果', icon: '🍎', sort_order: 5 },
  { id: 'frozen', name: '速食冻品', icon: '🧊', sort_order: 6 },
  { id: 'grain_oil', name: '粮油干货', icon: '🍚', sort_order: 7 },
  { id: 'pets', name: '萌宠生活', icon: '🐾', sort_order: 8 },
  { id: 'baby', name: '母婴用品', icon: '🍼', sort_order: 9 },
  { id: 'lifestyle', name: '品质生活', icon: '✨', sort_order: 10 },
  { id: 'drinks', name: '酒水饮料', icon: '🍷', sort_order: 11 },
];

function request(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function guessCategory(name, desc) {
  const text = (name + ' ' + (desc || '')).toLowerCase();
  
  if (text.includes('粽') || text.includes('端午') || text.includes('礼盒')) return 'dragon_boat';
  if (text.includes('狗') || text.includes('猫') || text.includes('宠')) return 'pets';
  if (text.includes('婴') || text.includes('奶粉') || text.includes('尿不湿') || text.includes('童')) return 'baby';
  if (text.includes('纸') || text.includes('洗衣') || text.includes('洗发') || text.includes('沐浴') || text.includes('牙膏') || text.includes('锅') || text.includes('杯')) return 'lifestyle';
  if (text.includes('油') || text.includes('米') || text.includes('面条') || text.includes('调料') || text.includes('干货') || text.includes('木耳') || text.includes('香菇')) return 'grain_oil';
  if (text.includes('水') || text.includes('饮料') || text.includes('酒') || text.includes('茶') || text.includes('咖啡') || text.includes('奶') || text.includes('汁') || text.includes('可乐')) return 'drinks';
  if (text.includes('肉') || text.includes('牛排') || text.includes('果') || text.includes('菜') || text.includes('虾') || text.includes('鱼') || text.includes('莓') || text.includes('瓜')) return 'fresh';
  if (text.includes('冷冻') || text.includes('包子') || text.includes('水饺') || text.includes('披萨') || text.includes('冰淇淋') || text.includes('速食') || text.includes('卷')) return 'frozen';
  if (text.includes('面包') || text.includes('蛋糕') || text.includes('吐司') || text.includes('烘焙') || text.includes('麻薯') || text.includes('瑞士卷') || text.includes('千层')) return 'bakery';
  if (text.includes('零食') || text.includes('薯片') || text.includes('干') || text.includes('糖') || text.includes('巧克力') || text.includes('坚果') || text.includes('瓜子')) return 'snacks';
  
  if (text.includes('烤鸡') || text.includes('人气') || text.includes('爆款')) return 'hot';
  
  // Default fallback
  return 'hot';
}

async function run() {
  try {
    console.log('Fetching all products...');
    const productsRes = await request(`${API_BASE}/products?pageSize=1000`);
    if (!productsRes.success) throw new Error(productsRes.error);
    const products = productsRes.data;
    console.log(`Found ${products.length} products.`);

    console.log('Updating products...');
    for (const p of products) {
      const newCategory = guessCategory(p.name, p.description);
      console.log(`- [${p.id}] ${p.name} => ${newCategory} (was ${p.category})`);
      
      const updateRes = await request(`${API_BASE}/products/${p.id}`, 'PUT', { category: newCategory });
      if (!updateRes.success) {
        console.error(`  Failed to update product ${p.id}:`, updateRes.error);
      }
    }

    console.log('Seeding new categories...');
    const catRes = await request(`${API_BASE}/categories/seed`, 'POST', { categories: DEFAULT_CATEGORIES });
    if (!catRes.success) throw new Error(catRes.error);
    
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

run();
