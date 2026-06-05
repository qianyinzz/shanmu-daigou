import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.trim().startsWith('#')) return;
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
}

import { getSupabaseClient } from '../server/src/storage/database/supabase-client';
import { DEFAULT_CATEGORIES } from '../src/data';

function guessCategory(name: string, desc: string) {
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
  
  return 'hot';
}

async function run() {
  const client = getSupabaseClient();
  
  console.log('1. 正在拉取所有商品...');
  const { data: products, error: pErr } = await client.from('products').select('*');
  if (pErr) throw new Error(pErr.message);
  
  if (!products) {
    console.log('数据库中没有找到商品。');
    return;
  }
  
  console.log(`找到 ${products.length} 个商品，正在智能更新分类...`);
  let updatedCount = 0;
  for (const p of products) {
    const newCategory = guessCategory(p.name, p.description);
    if (p.category !== newCategory) {
      console.log(`- [${p.id}] ${p.name} => ${newCategory} (原来是 ${p.category})`);
      const { error: updateErr } = await client.from('products').update({ category: newCategory }).eq('id', p.id);
      if (updateErr) console.error(`  更新失败: ${updateErr.message}`);
      else updatedCount++;
    } else {
      console.log(`- [${p.id}] ${p.name} 已经是 ${newCategory}，无需修改。`);
    }
  }

  console.log('2. 正在清空旧分类...');
  await client.from('categories').delete().neq('id', '');
  
  console.log('3. 正在刷入 11 个新分类...');
  const { error: cErr } = await client.from('categories').insert(DEFAULT_CATEGORIES);
  if (cErr) throw new Error(cErr.message);

  console.log(`\\n✅ 数据库迁移完美完成！共智能更新了 ${updatedCount} 个商品的分类！`);
}

run().catch(e => {
  console.error('❌ 迁移失败:', e.message || e);
});
