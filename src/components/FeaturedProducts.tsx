import React from 'react';
import { Product } from '../types';

const FeaturedProducts: React.FC<{ products: Product[] }> = ({ products }) => {
    return (
        <div className="featured-products">
            {products.map((product) => {
                const handleError = (event: React.SyntheticEvent) => {
                    const target = event.target as HTMLImageElement;
                    const src = target.src;
                    const newSrc = src.replace('.webp', '.jpg');

                    target.onerror = null; // Prevent infinite loop
                    target.src = newSrc;
                    // If the jpg also fails, set src to empty
                    target.onerror = () => {
                        target.src = '';
                        target.style.display = 'none'; // Optionally remove the image
                    };
                };

                return (
                    <div key={product.id} className="product">
                        <img src={product.imageUrl} onError={handleError} alt={product.name} />
                        <h3>{product.name}</h3>
                        <p>{product.price}</p>
                    </div>
                );
            })}
        </div>
    );
};

export default FeaturedProducts;