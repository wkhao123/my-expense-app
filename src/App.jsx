import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Home, 
  BarChart2, 
  History, 
  Utensils, 
  Shirt, 
  Car, 
  ShoppingBag, 
  Coffee, 
  Gamepad2, 
  Users, 
  MoreHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Trophy,
  Save,
  Trash2
} from 'lucide-react';

// --- 配置与常量 ---

const CATEGORIES = [
  { id: 'dining', name: '餐饮', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  { id: 'clothing', name: '服装', icon: Shirt, color: 'bg-blue-100 text-blue-600' },
  { id: 'transport', name: '交通', icon: Car, color: 'bg-indigo-100 text-indigo-600' },
  { id: 'daily', name: '日常', icon: ShoppingBag, color: 'bg-green-100 text-green-600' },
  { id: 'grocery', name: '买菜', icon: ShoppingBag, color: 'bg-emerald-100 text-emerald-600' }, // Reusing icon but different color
  { id: 'snacks', name: '零食', icon: Coffee, color: 'bg-yellow-100 text-yellow-600' },
  { id: 'entertainment', name: '娱乐', icon: Gamepad2, color: 'bg-purple-100 text-purple-600' },
  { id: 'social', name: '社交', icon: Users, color: 'bg-pink-100 text-pink-600' },
  { id: 'misc', name: '杂项', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-600' },
];

const MISC_SUB_OPTIONS = ['生活', '娱乐', '生存'];

// --- 工具函数 ---

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

// --- 组件 ---

// 简易 SVG 折线图组件 (为了轻量化，不引入重型图表库)
const SimpleLineChart = ({ data, color = "#3b82f6" }) => {
  if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-gray-400 text-sm">暂无数据</div>;

  const height = 160;
  const width = 300; // viewbox width
  const padding = 20;
  
  const maxVal = Math.max(...data.map(d => d.value)) || 100;
  const minVal = 0;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - ((d.value - minVal) / (maxVal - minVal || 1)) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#eee" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#eee" strokeWidth="1" />
        
        {/* Line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Dots */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
          const y = height - padding - ((d.value - minVal) / (maxVal - minVal || 1)) * (height - padding * 2);
          return (
            <circle key={i} cx={x} cy={y} r="3" fill="white" stroke={color} strokeWidth="2" />
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
};

export default function App() {
  // --- 状态管理 ---
  const [view, setView] = useState('home'); // home, add, stats, history
  const [transactions, setTransactions] = useState([]);
  const [showMonthlyPopup, setShowMonthlyPopup] = useState(false);
  const [lastMonthStats, setLastMonthStats] = useState(null);
  
  // 新增交易状态
  const [newTrans, setNewTrans] = useState({
    category: null,
    subCategory: null,
    amount: '',
    note: '',
    date: new Date().toISOString().split('T')[0]
  });

  // 历史/统计视图状态
  const [historyMonth, setHistoryMonth] = useState(new Date());
  const [statsPeriod, setStatsPeriod] = useState('month'); // week, month, year

  // --- 初始化与副作用 ---

  useEffect(() => {
    // 1. 加载数据
    const savedData = localStorage.getItem('expense_data');
    if (savedData) {
      setTransactions(JSON.parse(savedData));
    }

    // 2. 检查是否需要弹出月度报告
    const lastOpenMonth = localStorage.getItem('last_open_month');
    const currentMonthKey = getMonthKey(new Date());

    if (lastOpenMonth && lastOpenMonth !== currentMonthKey) {
      // 如果上次打开的月份不是本月，说明跨月了
      prepareMonthlyReport(JSON.parse(savedData || '[]'), lastOpenMonth);
    }
    
    // 更新最后打开月份
    localStorage.setItem('last_open_month', currentMonthKey);
  }, []);

  useEffect(() => {
    localStorage.setItem('expense_data', JSON.stringify(transactions));
  }, [transactions]);

  // --- 逻辑处理 ---

  const prepareMonthlyReport = (data, monthKey) => {
    const lastMonthData = data.filter(t => getMonthKey(new Date(t.date)) === monthKey);
    if (lastMonthData.length === 0) return;

    // 计算总支出
    const total = lastMonthData.reduce((acc, t) => acc + parseFloat(t.amount), 0);
    
    // 计算排行
    const catMap = {};
    lastMonthData.forEach(t => {
      const name = t.category.name + (t.subCategory ? `-${t.subCategory}` : '');
      catMap[name] = (catMap[name] || 0) + parseFloat(t.amount);
    });

    const ranking = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3) // Top 3
      .map(([name, amount]) => ({ name, amount }));

    setLastMonthStats({ month: monthKey, total, ranking });
    setShowMonthlyPopup(true);
  };

  const handleSaveTransaction = () => {
    if (!newTrans.amount) return alert("请输入金额");
    
    const transaction = {
      id: generateId(),
      ...newTrans,
      amount: parseFloat(newTrans.amount),
      createdAt: new Date().toISOString()
    };

    setTransactions(prev => [transaction, ...prev]);
    
    // 重置并回首页
    setNewTrans({
      category: null,
      subCategory: null,
      amount: '',
      note: '',
      date: new Date().toISOString().split('T')[0]
    });
    setView('home');
  };

  const deleteTransaction = (id) => {
    if(confirm('确定删除这条记录吗？')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  // --- 数据聚合 ---

  const currentMonthKey = getMonthKey(historyMonth);
  
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => getMonthKey(new Date(t.date)) === currentMonthKey);
  }, [transactions, currentMonthKey]);

  const currentMonthTotal = useMemo(() => {
    return currentMonthTransactions.reduce((acc, t) => acc + t.amount, 0).toFixed(2);
  }, [currentMonthTransactions]);

  const chartData = useMemo(() => {
    const now = new Date();
    let filtered = [];
    let groupingFormat = ''; // date, month

    if (statsPeriod === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      filtered = transactions.filter(t => new Date(t.date) >= oneWeekAgo);
      // Group by day
      const days = {};
      for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.toISOString().split('T')[0];
        days[key] = 0;
      }
      filtered.forEach(t => {
        if (days[t.date] !== undefined) days[t.date] += t.amount;
      });
      return Object.entries(days).map(([k, v]) => ({ label: formatDate(k), value: v }));
    } 
    else if (statsPeriod === 'month') {
      // Show current month daily curve
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const days = {};
      for(let i=1; i<=daysInMonth; i++) {
        const key = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        days[key] = 0;
      }
      currentMonthTransactions.forEach(t => {
        if (days[t.date] !== undefined) days[t.date] += t.amount;
      });
      // 过滤掉未来日期，只显示到今天，或者显示全月
      return Object.entries(days).map(([k, v]) => ({ label: parseInt(k.split('-')[2]), value: v }));
    }
    else if (statsPeriod === 'year') {
      const months = {};
      for(let i=1; i<=12; i++) {
        months[i] = 0;
      }
      const thisYear = now.getFullYear();
      transactions.filter(t => new Date(t.date).getFullYear() === thisYear).forEach(t => {
        const m = new Date(t.date).getMonth() + 1;
        months[m] += t.amount;
      });
      return Object.entries(months).map(([k, v]) => ({ label: `${k}月`, value: v }));
    }
    return [];
  }, [transactions, statsPeriod, currentMonthTransactions]);


  // --- 渲染子页面 ---

  const renderHome = () => (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* 头部卡片 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg mx-4 mt-4">
        <div className="text-blue-100 text-sm mb-1">{historyMonth.getFullYear()}年{historyMonth.getMonth()+1}月总支出</div>
        <div className="text-4xl font-bold font-mono">¥{currentMonthTotal}</div>
        <div className="mt-4 flex items-center text-xs text-blue-200 bg-white/10 w-fit px-3 py-1 rounded-full">
          <span>📅 今日已记 {transactions.filter(t => t.date === new Date().toISOString().split('T')[0]).length} 笔</span>
        </div>
      </div>

      {/* 列表 */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 text-lg">近期明细</h3>
          <button onClick={() => setView('history')} className="text-sm text-blue-600">查看更多</button>
        </div>
        
        {currentMonthTransactions.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
            本月暂无支出，开始记一笔吧！
          </div>
        ) : (
          <div className="space-y-3">
            {currentMonthTransactions.slice(0, 20).map(t => (
              <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${t.category.color.replace('text-', 'bg-').replace('100', '100')} ${t.category.color.split(' ')[1]}`}>
                    <t.category.icon size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-sm">
                      {t.category.name} 
                      {t.subCategory && <span className="text-xs text-gray-500 ml-1">({t.subCategory})</span>}
                    </div>
                    <div className="text-xs text-gray-400">{formatDate(t.date)} {t.note && `· ${t.note}`}</div>
                  </div>
                </div>
                <div className="font-mono font-bold text-gray-800">-{t.amount}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAdd = () => {
    // 阶段 1: 选择主分类
    if (!newTrans.category) {
      return (
        <div className="p-6 pb-24 h-full flex flex-col animate-slide-up">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">选择分类</h2>
          <div className="grid grid-cols-3 gap-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  if (cat.id === 'misc') {
                    // 杂项特殊处理，先存category，界面会刷新进入阶段2
                    setNewTrans({ ...newTrans, category: cat });
                  } else {
                    // 普通分类直接跳到金额输入
                    setNewTrans({ ...newTrans, category: cat });
                  }
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all active:scale-95 ${cat.color} aspect-square`}
              >
                <cat.icon size={28} className="mb-2" />
                <span className="font-medium text-sm">{cat.name}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setView('home')} className="mt-auto w-full py-4 text-gray-500 font-medium">取消</button>
        </div>
      );
    }

    // 阶段 2: 杂项子分类选择 (如果是杂项且没选子类)
    if (newTrans.category.id === 'misc' && !newTrans.subCategory) {
      return (
        <div className="p-6 h-full flex flex-col animate-slide-up">
          <div className="flex items-center gap-2 mb-8">
            <button onClick={() => setNewTrans({...newTrans, category: null})}><ChevronLeft className="text-gray-400" /></button>
            <h2 className="text-2xl font-bold text-gray-800">杂项归类</h2>
          </div>
          <div className="space-y-4">
            {MISC_SUB_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setNewTrans({ ...newTrans, subCategory: opt })}
                className="w-full p-6 text-left text-lg font-bold text-gray-700 bg-gray-50 rounded-2xl border border-gray-200 active:bg-blue-50 active:border-blue-200 transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // 阶段 3: 金额与详情
    return (
      <div className="p-6 h-full flex flex-col animate-slide-up">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => {
            if (newTrans.category.id === 'misc') setNewTrans({...newTrans, subCategory: null});
            else setNewTrans({...newTrans, category: null});
          }}>
            <ChevronLeft className="text-gray-400" />
          </button>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${newTrans.category.color}`}>
            {newTrans.category.name} {newTrans.subCategory ? `- ${newTrans.subCategory}` : ''}
          </div>
        </div>

        <div className="mb-8">
          <label className="text-xs text-gray-400 font-bold ml-1 uppercase">金额</label>
          <div className="flex items-center border-b-2 border-blue-500 py-2">
            <span className="text-3xl font-bold text-gray-800 mr-2">¥</span>
            <input
              type="number"
              autoFocus
              value={newTrans.amount}
              onChange={(e) => setNewTrans({ ...newTrans, amount: e.target.value })}
              placeholder="0.00"
              className="w-full text-4xl font-mono font-bold text-gray-900 placeholder-gray-200 outline-none bg-transparent"
            />
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-bold ml-1 uppercase">日期</label>
            <input
              type="date"
              value={newTrans.date}
              onChange={(e) => setNewTrans({ ...newTrans, date: e.target.value })}
              className="w-full mt-2 p-3 bg-gray-50 rounded-xl font-medium text-gray-700 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold ml-1 uppercase">备注 (可选)</label>
            <input
              type="text"
              value={newTrans.note}
              onChange={(e) => setNewTrans({ ...newTrans, note: e.target.value })}
              placeholder="比如：和朋友聚餐..."
              className="w-full mt-2 p-3 bg-gray-50 rounded-xl font-medium text-gray-700 outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSaveTransaction}
          className="mt-auto w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <Save size={20} />
          完成记账
        </button>
      </div>
    );
  };

  const renderStats = () => (
    <div className="p-6 pb-20 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">消费趋势</h2>
      
      {/* 切换周期 */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
        {['week', 'month', 'year'].map(p => (
          <button
            key={p}
            onClick={() => setStatsPeriod(p)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${statsPeriod === p ? 'bg-white shadow text-black' : 'text-gray-400'}`}
          >
            {{week: '本周', month: '本月', year: '全年'}[p]}
          </button>
        ))}
      </div>

      {/* 图表 */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <SimpleLineChart data={chartData} />
      </div>

      {/* 排行榜 (简单版) */}
      <h3 className="font-bold text-gray-800 mb-4">支出分类占比</h3>
      <div className="space-y-3">
        {Object.entries(
          transactions.reduce((acc, t) => {
            // 根据当前选中的统计周期过滤
            // 这里简单处理，默认显示全部数据的分类占比，实际项目可细化
            const name = t.category.name;
            acc[name] = (acc[name] || 0) + t.amount;
            return acc;
          }, {})
        )
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount], idx) => {
           const total = transactions.reduce((sum, t) => sum + t.amount, 0);
           const percent = ((amount / total) * 100).toFixed(1);
           const cat = CATEGORIES.find(c => c.name === name) || CATEGORIES[8];
           return (
             <div key={name} className="flex items-center gap-3">
               <div className="w-8 text-sm font-bold text-gray-400">#{idx + 1}</div>
               <div className={`p-2 rounded-lg ${cat.color.split(' ')[0]}`}>
                 <cat.icon size={16} className={cat.color.split(' ')[1]} />
               </div>
               <div className="flex-1">
                 <div className="flex justify-between text-sm font-bold text-gray-700">
                   <span>{name}</span>
                   <span>{percent}%</span>
                 </div>
                 <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                   <div className="h-full bg-gray-800 rounded-full" style={{ width: `${percent}%` }}></div>
                 </div>
               </div>
             </div>
           )
        })}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="p-4 pb-20 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">历史账单</h2>
        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
          <button onClick={() => {
            const d = new Date(historyMonth);
            d.setMonth(d.getMonth() - 1);
            setHistoryMonth(d);
          }}><ChevronLeft size={16} /></button>
          <span className="text-sm font-bold font-mono min-w-[80px] text-center">
            {historyMonth.getFullYear()}-{String(historyMonth.getMonth()+1).padStart(2,'0')}
          </span>
          <button onClick={() => {
            const d = new Date(historyMonth);
            d.setMonth(d.getMonth() + 1);
            setHistoryMonth(d);
          }}><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="space-y-2">
        {currentMonthTransactions.length === 0 ? (
          <div className="text-center py-20 text-gray-400">本月没有记录</div>
        ) : (
          currentMonthTransactions
            .sort((a, b) => new Date(b.date) - new Date(a.date)) // 按日期倒序
            .map(t => (
            <div key={t.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-gray-50 text-gray-500`}>
                  <t.category.icon size={16} />
                </div>
                <div>
                  <div className="font-bold text-gray-800 text-sm">
                    {t.category.name} {t.subCategory && `(${t.subCategory})`}
                  </div>
                  <div className="text-xs text-gray-400">{t.date} {t.note}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-gray-800">-{t.amount}</span>
                <button onClick={() => deleteTransaction(t.id)} className="text-red-300 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-white flex flex-col max-w-md mx-auto relative overflow-hidden font-sans">
      
      {/* 弹窗：月度报告 */}
      {showMonthlyPopup && lastMonthStats && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
            <button onClick={() => setShowMonthlyPopup(false)} className="absolute top-4 right-4 text-gray-300"><X /></button>
            
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-500 mb-3">
                <Trophy size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">上月消费报告</h3>
              <p className="text-gray-400 text-sm">{lastMonthStats.month}</p>
            </div>

            <div className="text-center mb-8">
              <div className="text-gray-500 text-sm">总支出</div>
              <div className="text-4xl font-bold text-gray-900 font-mono">¥{lastMonthStats.total.toFixed(2)}</div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top 3 剁手榜</div>
              {lastMonthStats.ranking.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${['bg-yellow-400', 'bg-gray-400', 'bg-orange-400'][idx]}`}>
                      {idx + 1}
                    </span>
                    <span className="font-medium text-gray-700">{item.name}</span>
                  </div>
                  <span className="font-bold text-gray-900">¥{item.amount}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowMonthlyPopup(false)}
              className="w-full bg-black text-white py-3 rounded-xl font-bold"
            >
              我知道了，这个月省点！
            </button>
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {view === 'home' && renderHome()}
        {view === 'add' && renderAdd()}
        {view === 'stats' && renderStats()}
        {view === 'history' && renderHistory()}
      </div>

      {/* 底部导航 (记账时隐藏) */}
      {view !== 'add' && (
        <div className="h-20 bg-white border-t border-gray-100 flex items-center justify-around px-2 shrink-0">
          <NavButton active={view === 'home'} onClick={() => setView('home')} icon={Home} label="明细" />
          
          {/* 中间的大加号 */}
          <button 
            onClick={() => {
              // 重置新增状态
              setNewTrans({ category: null, subCategory: null, amount: '', note: '', date: new Date().toISOString().split('T')[0] });
              setView('add');
            }}
            className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center shadow-lg shadow-gray-300 transform -translate-y-4 active:scale-95 transition-all"
          >
            <Plus size={28} />
          </button>

          <NavButton active={view === 'stats'} onClick={() => setView('stats')} icon={BarChart2} label="图表" />
        </div>
      )}
    </div>
  );
}

const NavButton = ({ active, onClick, icon: Icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 gap-1 ${active ? 'text-black' : 'text-gray-300'}`}>
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);