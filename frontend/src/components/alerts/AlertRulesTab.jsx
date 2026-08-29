import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_TABS = [
  { label: 'ALL', value: 'all' },
  { label: 'New', value: 'new'},
  { label: 'Acknowledged', value: 'acknowledged'},
  { label: 'Resolved', value: 'resolved'},
];

export default function TriggeredAlertsTab(){
  return (
    <div className='space-y-6'>
      <div className='bg-fleet-surface border border-fleet rounded-lg p-6 space-y-4'>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle ID</TableHead>
              <TableHead>Alert Name</TableHead>
              <TableHead>Breach Value</TableHead>
              <TableHead>Fleet Group</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody/>

        </Table>

      </div>
    </div>
  );
}