
import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { ChartData } from '@/utils/types';

interface RechartsBarData {
  name: string;
  [key: string]: string | number;
}

interface LoanChartsProps {
  statusData: ChartData[];
  amountData: {
    oneDollar: ChartData[];
    tenDollar: ChartData[];
  };
}

const LoanCharts = ({ statusData, amountData }: LoanChartsProps) => {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  
  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Loan Analysis</h2>
        
        <div className="flex space-x-2">
          <button
            className={`p-2 rounded-md ${chartType === 'bar' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
            onClick={() => setChartType('bar')}
          >
            <BarChart3 size={18} />
          </button>
          <button
            className={`p-2 rounded-md ${chartType === 'pie' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
            onClick={() => setChartType('pie')}
          >
            <PieChartIcon size={18} />
          </button>
        </div>
      </div>
      
      <Tabs defaultValue="status">
        <TabsList className="mb-6">
          <TabsTrigger value="status">By Status</TabsTrigger>
          <TabsTrigger value="amount">By Amount</TabsTrigger>
        </TabsList>
        
        <TabsContent value="status">
          <motion.div
            key={`status-${chartType}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-[300px] w-full"
          >
            {chartType === 'bar' ? (
              <StatusBarChart data={statusData} />
            ) : (
              <StatusPieChart data={statusData} />
            )}
          </motion.div>
        </TabsContent>
        
        <TabsContent value="amount">
          <Tabs defaultValue="one">
            <TabsList className="mb-4">
              <TabsTrigger value="one">$1 Loans</TabsTrigger>
              <TabsTrigger value="ten">$10 Loans</TabsTrigger>
            </TabsList>
            
            <TabsContent value="one">
              <motion.div
                key={`one-${chartType}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="h-[300px] w-full"
              >
                {chartType === 'bar' ? (
                  <AmountBarChart data={amountData.oneDollar} title="$1 Loans" />
                ) : (
                  <AmountPieChart data={amountData.oneDollar} title="$1 Loans" />
                )}
              </motion.div>
            </TabsContent>
            
            <TabsContent value="ten">
              <motion.div
                key={`ten-${chartType}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="h-[300px] w-full"
              >
                {chartType === 'bar' ? (
                  <AmountBarChart data={amountData.tenDollar} title="$10 Loans" />
                ) : (
                  <AmountPieChart data={amountData.tenDollar} title="$10 Loans" />
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label, title }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background border border-border/50 rounded-lg p-2 shadow-lg text-xs">
      {title && <p className="font-medium mb-1">{title}</p>}
      {label && <p className="text-muted-foreground mb-1">{label}</p>}
      {payload.map((entry: any, index: number) => (
        <div key={`tooltip-item-${index}`} className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-sm" 
            style={{ backgroundColor: entry.fill || entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}: </span>
          <span className="font-medium">{entry.value} loans</span>
        </div>
      ))}
    </div>
  );
};

// Transform ChartData array into a format suitable for Recharts bar charts
const prepareBarChartData = (data: ChartData[]): RechartsBarData[] => {
  // Create a single object with all categories as properties
  const result: RechartsBarData = { name: 'Loan Status' };
  
  data.forEach(item => {
    result[item.name] = item.value;
  });
  
  return [result]; // Return as an array with a single object
};

const StatusBarChart = ({ data }: { data: ChartData[] }) => {
  const barData = prepareBarChartData(data);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={barData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        barGap={10}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        
        {/* Create one Bar component for each status category */}
        {data.map((item, index) => (
          <Bar 
            key={`bar-${index}`} 
            dataKey={item.name} 
            fill={item.color} 
            radius={[4, 4, 0, 0]}
            name={item.name}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

const StatusPieChart = ({ data }: { data: ChartData[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        outerRadius={100}
        innerRadius={60}
        fill="#8884d8"
        dataKey="value"
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip content={<CustomTooltip />} />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

const AmountBarChart = ({ data, title }: { data: ChartData[], title: string }) => {
  const barData = prepareBarChartData(data);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={barData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        barGap={10}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip content={(props) => <CustomTooltip {...props} title={title} />} />
        <Legend />
        
        {/* Create one Bar component for each status category */}
        {data.map((item, index) => (
          <Bar 
            key={`bar-${index}`} 
            dataKey={item.name} 
            fill={item.color} 
            radius={[4, 4, 0, 0]}
            name={item.name}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

const AmountPieChart = ({ data, title }: { data: ChartData[], title: string }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        outerRadius={100}
        innerRadius={60}
        fill="#8884d8"
        dataKey="value"
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip content={(props) => <CustomTooltip {...props} title={title} />} />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

export default LoanCharts;
