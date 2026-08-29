import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '../ui/button';

export default function AlertRulesTab() {
  return (
    <div className='bg-fleet-surface border border-fleet-border rounded-lg p-6 space-y-4'>
      <h2 className='text-lg font-display text-fleet-text'>Alerts Rules</h2>
      <Button className='bg-fleet-blue/90'>
        Create Alert Rules
      </Button>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rule Name</TableHead>
          <TableHead>Condition</TableHead>
          <TableHead>Threshold</TableHead>
          <TableHead>Fleet Group</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className='text-right'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody />
    </Table>

  </div>
  );
}