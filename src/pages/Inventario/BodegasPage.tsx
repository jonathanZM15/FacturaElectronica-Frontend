import React from 'react';
import { BodegaForm } from '../../components/inventory/BodegaForm';
import { useUser } from '../../contexts/userContext';

export default function BodegasPage() {
    const { user } = useUser();
    const emisorId = (user as any)?.emisor_id || 6;
    
    return <BodegaForm emisorId={emisorId} />;
}
