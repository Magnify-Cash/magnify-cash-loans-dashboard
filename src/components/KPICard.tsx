
import { motion } from "framer-motion";

interface KPICardProps {
  title: string;
  value: number | string;
  description?: string;
  icon?: React.ReactNode;
  index?: number;
}

const KPICard = ({ title, value, description, icon, index = 0 }: KPICardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="glass-card rounded-xl p-6 h-full"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && <div className="text-primary">{icon}</div>}
      </div>
      
      <div className="mt-2">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 10,
            delay: 0.2 + index * 0.1 
          }}
        >
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
        </motion.div>
        
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </motion.div>
  );
};

export default KPICard;
