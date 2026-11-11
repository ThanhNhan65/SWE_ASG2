import {create} from 'zustand';
import {persist} from 'zustand/middleware';


export interface ToppingItem{
    id: number
    name: string;
    price: number;
}

export interface CartItem{
    id: number;
    productId: number;
    name: string;
    size: 'S' | 'M' | "L";
    sweetness: string;
    ice: string;
    toppings: ToppingItem[];
    unitPrice: number;
    qty: number;
    lineTotal: number;
}

export interface AddToCardPayLoad{
    productId: number;
    name: string;
    unitPrice: number;
    size: 'S' | 'M' | "L";
    sweetness?: string;
    ice?: string;
    qty: number;
    toppings?: ToppingItem[];
}

export interface CartState{
    items: CartItem[];
    totalAmount: number;
    badgeCount: number;
    isLoading: boolean;
    fetchCart: () => void;
    addToCart: (payload: AddToCardPayLoad) => void;
    updateQty: (cartItemId: number, qty: number) => void;
    removeItem: (cartItemId: number) => void;
    clearCart: () => void;
}

const computeTotals = (items: CartItem[]) =>{
    const totalAmount = items.reduce( (sum,item) => sum + (item.lineTotal || item.unitPrice * item.qty), 0);
    const badgeCount = items.reduce((sum, item) => sum + item.qty, 0);
    return {totalAmount , badgeCount};
};

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            totalAmount: 0,
            badgeCount: 0,
            isLoading: false,

            fetchCart: () => {
                const { totalAmount, badgeCount} = computeTotals(get().items)
                set({totalAmount, badgeCount});
            },
            addToCart: (payload) => {
                const currentItems = get().items;
                const toppings = payload.toppings || [];
                const sweetness = payload.sweetness || '100%';
                const ice = payload.ice || 'Bình thường';

                const existingIndex = currentItems.findIndex(
                    (item) =>
                                item.productId === payload.productId &&
                                item.size === payload.size &&
                                item.sweetness === sweetness &&
                                item.ice === ice &&
                                JSON.stringify(item.toppings.map((t) => t.id).sort()) === JSON.stringify(toppings.map((t) => t.id).sort()),
                );

                let updateItems: CartItem[];
                if(existingIndex > -1){
                    updateItems = currentItems.map((item, index) => {
                        if(index === existingIndex){
                            const newQty= item.qty + payload.qty;
                            return{
                                ...item,
                                qty: newQty,
                                lineTotal: item.unitPrice * newQty,
                            };
                        }
                        return item;
                    });
                }else{
                    const newItem: CartItem ={
                        id: Date.now() + Math.floor(Math.random() * 1000),
                        productId: payload.productId,
                        name: payload.name,
                        size: payload.size,
                        sweetness,
                        ice,
                        toppings,
                        unitPrice: payload.unitPrice,
                        qty: payload.qty,
                        lineTotal: payload.unitPrice * payload.qty, 
                    };
                    updateItems = [...currentItems, newItem];
                }
                const {totalAmount, badgeCount} = computeTotals(updateItems);
                set({items: updateItems, totalAmount, badgeCount});

            },

            updateQty : (cartItemId, qty) =>{
                if(qty <= 0){
                    get().removeItem(cartItemId);
                    return;
                }

                const updateItems = get().items.map( (item) =>
                    item.id === cartItemId ? {...item, qty, lineTotal : item.unitPrice* qty, } : item,
                );

                const {totalAmount, badgeCount} = computeTotals(updateItems);
                set({items: updateItems, totalAmount, badgeCount});
            },

            removeItem: (cartItemId) => {
                const updatedItems = get().items.filter((item) => item.id !== cartItemId);
                const { totalAmount, badgeCount } = computeTotals(updatedItems);
                set({ items: updatedItems, totalAmount, badgeCount });
            },

            clearCart: () => {
                set({ items: [], totalAmount: 0, badgeCount: 0 });
            },
        }),
        {
            name: 'brewlite-car-storage',
        },
    ),
);