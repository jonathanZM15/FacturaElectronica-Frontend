import React from 'react';
import { KardexView } from '../../components/inventory/KardexView';
import { useUser } from '../../contexts/userContext';

export default function KardexPage() {
    const { user } = useUser();
    const emisorId = (user as any)?.emisor_id || 1;
    
    return <KardexView emisorId={emisorId} />;
}
