import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  Search, RefreshCw, Filter, Clock, Zap, AlertCircle, 
  CheckCircle2, ArrowDownToLine, Trash2, X, FileText,
  ChevronDown, Database, Eye, Terminal
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  status_code: number;
  ip: string;
  api_key_name?: string;
  model: string;
  provider: string;
  process_time: number;
  first_response_time?: number;
  content_start_time?: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  stream: boolean;
  error_type?: string;
  request?: any;
  response?: any;
}

export default function Logs() {
  const { apiKey } = useAuthStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterModel, setFilterModel] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [limit, setLimit] = useState(50);
  const [showFilters, setShowFilters] = useState(false);
  
  // View Details State
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const fetchLogs = async (isLoadMore = false) => {
    if (!apiKey) return;
    setLoading(true);
    
    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
      });
      if (searchQuery) queryParams.append('search', searchQuery);
      if (filterLevel !== 'ALL') queryParams.append('level', filterLevel);
      if (filterModel) queryParams.append('model', filterModel);
      if (filterProvider) queryParams.append('provider', filterProvider);

      const res = await fetch(`/v1/logs?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        const fetchedLogs = data.logs || [];
        setLogs(fetchedLogs);
        setHasMore(fetchedLogs.length === limit);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterLevel, filterModel, filterProvider, limit]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  // ========== Helpers ==========
  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (code >= 400 && code < 500) return 'text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-red-600 dark:text-red-500 bg-red-500/10 border-red-500/20';
  };

  const calculateSpeed = (log: LogEntry) => {
    if (!log.completion_tokens || !log.process_time) return null;
    
    let startTime = log.content_start_time || log.first_response_time || 0;
    const genTime = log.process_time - startTime;
    if (genTime <= 0) return null;

    const speed = log.completion_tokens / genTime;
    let color = 'text-muted-foreground';
    if (speed >= 80) color = 'text-purple-600 dark:text-purple-400';
    else if (speed >= 40) color = 'text-emerald-600 dark:text-emerald-400';
    else if (speed < 15) color = 'text-yellow-600 dark:text-yellow-500';

    return <span className={color}>{speed.toFixed(1)} t/s</span>;
  };

  // Mobile Log Card
  const LogCard = ({ log }: { log: LogEntry }) => (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground truncate" title={log.model}>{log.model}</div>
          <div className="text-xs text-muted-foreground">{log.provider || '未知渠道'}</div>
        </div>
        <span className={`px-2 py-1 rounded font-mono text-xs font-medium border ${getStatusColor(log.status_code)}`}>
          {log.status_code}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">时间</div>
          <div className="font-mono text-foreground text-xs">{log.timestamp}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">耗时</div>
          <div className="font-mono text-foreground">{log.process_time.toFixed(2)}s</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">Tokens</div>
          <div className="font-mono text-foreground">
            <span className="text-muted-foreground">{log.prompt_tokens}</span>+<span className="text-blue-600 dark:text-blue-400">{log.completion_tokens}</span>={log.total_tokens}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">速度</div>
          <div className="font-mono">{calculateSpeed(log) || '-'}</div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <span>{log.api_key_name || '-'}</span> · <span className="font-mono">{log.ip}</span>
        </div>
        <button 
          onClick={() => setSelectedLog(log)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          title="查看详情"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 font-sans pb-12 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">系统日志</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">监控 API 请求详情与性能</p>
        </div>
        <button 
          onClick={() => fetchLogs()} 
          className="p-2 text-muted-foreground hover:text-foreground bg-card border border-border rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-card border border-border p-3 sm:p-4 rounded-xl shadow-sm space-y-3 flex-shrink-0">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索 ID, Key, IP..."
            className="w-full bg-background border border-border focus:border-primary pl-10 pr-4 py-2 rounded-lg text-sm text-foreground"
          />
        </form>

        {/* Mobile Filter Toggle */}
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-muted-foreground md:hidden w-full justify-center py-1"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? '收起筛选' : '展开筛选'}
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* Filters - Always show on desktop, toggle on mobile */}
        <div className={`flex flex-col sm:flex-row gap-3 ${showFilters ? 'block' : 'hidden md:flex'}`}>
          <select 
            value={filterLevel} 
            onChange={e => setFilterLevel(e.target.value)}
            className="bg-background border border-border text-sm px-3 py-2 rounded-lg text-foreground flex-1 sm:flex-none"
          >
            <option value="ALL">所有等级</option>
            <option value="INFO">INFO (2xx)</option>
            <option value="WARNING">WARNING (4xx)</option>
            <option value="ERROR">ERROR (5xx)</option>
          </select>

          <input 
            type="text" 
            placeholder="Model 过滤"
            value={filterModel}
            onChange={e => setFilterModel(e.target.value)}
            className="bg-background border border-border text-sm px-3 py-2 rounded-lg text-foreground flex-1 sm:w-32 sm:flex-none"
          />

          <input 
            type="text" 
            placeholder="Provider"
            value={filterProvider}
            onChange={e => setFilterProvider(e.target.value)}
            className="bg-background border border-border text-sm px-3 py-2 rounded-lg text-foreground flex-1 sm:w-32 sm:flex-none"
          />
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3 flex-1 overflow-auto">
        {logs.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p>未找到匹配的日志</p>
          </div>
        ) : (
          logs.map((log) => <LogCard key={log.id} log={log} />)
        )}
        
        {hasMore && logs.length > 0 && (
          <button 
            onClick={() => setLimit(prev => prev + 50)} 
            className="w-full text-sm text-muted-foreground hover:text-foreground font-medium flex items-center justify-center gap-1.5 py-4 bg-card border border-border rounded-xl"
          >
            <ArrowDownToLine className="w-4 h-4" /> 加载更多 ({logs.length})
          </button>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:flex flex-1 bg-card border border-border rounded-xl overflow-hidden shadow-sm flex-col">
        {logs.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p>未找到匹配的日志</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-muted text-muted-foreground font-medium sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4">时间 / ID</th>
                  <th className="px-6 py-4">Key / IP</th>
                  <th className="px-6 py-4">模型 / 渠道</th>
                  <th className="px-6 py-4">Tokens (P+C=T)</th>
                  <th className="px-6 py-4">耗时 / 速度</th>
                  <th className="px-6 py-4 text-center">状态</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log, i) => (
                  <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-foreground">{log.timestamp}</div>
                      <div className="text-xs text-muted-foreground/60 mt-1 truncate max-w-[120px]" title={log.id}>
                        {log.id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground">{log.api_key_name || '-'}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">{log.ip}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground font-medium max-w-[150px] truncate" title={log.model}>{log.model}</div>
                      <div className="text-xs text-muted-foreground mt-1">{log.provider || '未知渠道'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-foreground">
                      <span className="text-muted-foreground">{log.prompt_tokens}</span> + <span className="text-blue-600 dark:text-blue-400">{log.completion_tokens}</span> = {log.total_tokens}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground font-mono">{log.process_time.toFixed(2)}s</div>
                      <div className="text-xs font-mono mt-1">
                        {calculateSpeed(log)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded font-mono font-medium border ${getStatusColor(log.status_code)}`}>
                        {log.status_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination / Load More */}
        {hasMore && logs.length > 0 && (
          <div className="p-4 bg-muted border-t border-border text-center">
            <button 
              onClick={() => setLimit(prev => prev + 50)} 
              className="text-sm text-muted-foreground hover:text-foreground font-medium flex items-center justify-center gap-1.5 mx-auto"
            >
              <ArrowDownToLine className="w-4 h-4" /> 加载更多 (当前: {logs.length})
            </button>
          </div>
        )}
      </div>

      {/* Log Detail Modal - Responsive */}
      <Dialog.Root open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:w-[90vw] md:w-[800px] max-h-[85vh] bg-background border border-border rounded-xl shadow-2xl z-50 flex flex-col">
            <div className="p-4 sm:p-5 border-b border-border flex justify-between items-center bg-muted/30">
              <Dialog.Title className="text-lg font-bold text-foreground flex items-center gap-2">
                <Terminal className="w-5 h-5 text-primary" /> 日志详情
              </Dialog.Title>
              <Dialog.Close className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></Dialog.Close>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Meta Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 bg-muted p-3 sm:p-4 rounded-lg border border-border">
                <div><div className="text-xs text-muted-foreground mb-1">Status</div><div className="font-mono text-foreground">{selectedLog?.status_code}</div></div>
                <div><div className="text-xs text-muted-foreground mb-1">Time</div><div className="font-mono text-foreground">{selectedLog?.process_time.toFixed(2)}s</div></div>
                <div><div className="text-xs text-muted-foreground mb-1">First Response</div><div className="font-mono text-foreground">{selectedLog?.first_response_time ? `${selectedLog.first_response_time.toFixed(2)}s` : '-'}</div></div>
                <div><div className="text-xs text-muted-foreground mb-1">Stream</div><div className="text-foreground">{selectedLog?.stream ? 'Yes' : 'No'}</div></div>
              </div>

              {/* Request Data */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Request Data</h3>
                <pre className="bg-muted border border-border p-3 sm:p-4 rounded-lg text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap max-h-48 sm:max-h-60">
                  {selectedLog?.request ? JSON.stringify(selectedLog.request, null, 2) : 'No request data available'}
                </pre>
              </div>

              {/* Response Data */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Response / Error Data</h3>
                <pre className="bg-muted border border-border p-3 sm:p-4 rounded-lg text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap max-h-48 sm:max-h-60">
                  {selectedLog?.response ? JSON.stringify(selectedLog.response, null, 2) : 'No response data available'}
                </pre>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}
