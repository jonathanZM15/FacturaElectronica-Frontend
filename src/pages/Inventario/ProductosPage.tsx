import React from 'react';
import { ProductForm } from '../../components/inventory/ProductForm';
import { useUser } from '../../contexts/userContext';

export default function ProductosPage() {
    const { user } = useUser();
    const emisorId = (user as any)?.emisor_id || 1;
    
    return <ProductForm emisorId={emisorId} />;
}
