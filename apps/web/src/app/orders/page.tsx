'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Coffee, RefreshCw, RotateCcw, ShoppingBag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getAuthToken, getStoredUser } from '@/lib/auth';

export interface OrderItem {
  id?: number;
  productId: number | string;
  name?: string;
  quantity: number;
  size?: string;
  sweetness?: string;
  ice?: string;
  unitPrice?: number;
  lineTotal?: number;
}

export interface Order {
  id: string;
  orderCode: string;
  userId: string;
  status: 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'PAYMENT_FAILED';
  totalAmount?: number;
  total?: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; step: number }> = {
  PENDING: { label: 'Chờ thanh toán', color: 'bg-amber-100 text-amber-800 border-amber-300', step: 1 },
  PAID: { label: 'Đã thanh toán', color: 'bg-blue-100 text-blue-800 border-blue-300', step: 2 },
  PREPARING: { label: 'Đang pha chế', color: 'bg-orange-100 text-orange-800 border-orange-300', step: 3 },
  READY: { label: 'Món sẵn sàng', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', step: 4 },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-stone-100 text-stone-800 border-stone-300', step: 5 },
  PAYMENT_FAILED: { label: 'Thanh toán lỗi', color: 'bg-red-100 text-red-800 border-red-300', step: 0 },
  CANCELLED: { label: 'Đã hủy', color: 'bg-rose-100 text-rose-800 border-rose-300', step: 0 },
};

const TIMELINE_STEPS = [
  { key: 'PAID', label: 'Đã thanh toán' },
  { key: 'PREPARING', label: 'Đang pha chế' },
  { key: 'READY', label: 'Mời nhận nước' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchOrders = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/orders/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOrders(data);
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    setIsMounted(true);
    const user = getStoredUser();
    setIsLoggedIn(!!user);
    if (user) {
      fetchOrders();
    } else {
      setIsLoading(false);
    }
  }, [fetchOrders]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-stone-100 text-stone-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold text-lg text-stone-900">Lịch sử & Trạng thái đơn</h1>
        <button
          onClick={() => fetchOrders(true)}
          disabled={isRefreshing}
          className="p-2 -mr-2 rounded-full hover:bg-stone-100 text-stone-700"
          title="Làm mới"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-amber-700' : ''}`} />
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {!isLoggedIn ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-800">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-stone-900">Bạn chưa đăng nhập</h2>
              <p className="text-sm text-stone-500">Vui lòng đăng nhập để xem lịch sử đơn hàng của bạn.</p>
            </div>
            <Link
              href="/login?redirect=/orders"
              className="inline-block bg-amber-700 hover:bg-amber-800 text-white font-semibold px-6 py-2.5 rounded-xl transition"
            >
              Đăng nhập ngay
            </Link>
          </div>
        ) : isLoading ? (
          <div className="py-20 text-center text-stone-500 space-y-2">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-600 border-t-transparent" />
            <p className="text-sm">Đang tải lịch sử đơn hàng...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-800">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-stone-900">Chưa có đơn hàng nào</h2>
              <p className="text-sm text-stone-500">Hãy đặt ngay những ly cà phê đầu tiên tại BrewLite nhé!</p>
            </div>
            <Link
              href="/"
              className="inline-block bg-amber-700 hover:bg-amber-800 text-white font-medium px-6 py-2.5 rounded-xl transition"
            >
              Khám phá thực đơn
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const currentStatusMeta = STATUS_LABELS[order.status] || {
                label: order.status,
                color: 'bg-stone-100 text-stone-800 border-stone-300',
                step: 1,
              };

              const currentStep = currentStatusMeta.step;
              const isFinishedOrCancelled = order.status === 'COMPLETED' || order.status === 'CANCELLED';

              return (
                <div
                  key={order.id || order.orderCode}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 space-y-3.5"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <div>
                      <span className="font-bold text-sm text-stone-900">#{order.orderCode}</span>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : ''}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${currentStatusMeta.color}`}
                    >
                      {currentStatusMeta.label}
                    </span>
                  </div>

                  {!isFinishedOrCancelled && currentStep >= 2 && (
                    <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-amber-950">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          Tiến trình pha chế
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center">
                        {TIMELINE_STEPS.map((st, idx) => {
                          const stepNumber = idx + 2;
                          const isDone = currentStep >= stepNumber;
                          const isCurrent = currentStep === stepNumber;

                          return (
                            <div key={st.key} className="flex flex-col items-center">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                  isDone
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-stone-200 text-stone-500'
                                } ${isCurrent ? 'ring-2 ring-amber-400 ring-offset-1 scale-110' : ''}`}
                              >
                                {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                              </div>
                              <span
                                className={`text-[10px] mt-1 line-clamp-1 ${
                                  isCurrent ? 'font-bold text-amber-900' : 'text-stone-500'
                                }`}
                              >
                                {st.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-stone-700">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-amber-900">
                            <Coffee className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-medium text-stone-900">{item.name || `Sản phẩm #${item.productId}`}</span>
                            <span className="text-stone-400 ml-1.5 font-semibold">x{item.quantity}</span>
                            {item.size && (
                              <p className="text-[11px] text-stone-400">
                                Size {item.size} {item.sweetness && `| ${item.sweetness}`} {item.ice && `| ${item.ice}`}
                              </p>
                            )}
                          </div>
                        </div>
                        {item.unitPrice && (
                          <span className="font-semibold text-stone-800">
                            {(item.lineTotal || item.unitPrice * item.quantity).toLocaleString('vi-VN')} đ
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-xs text-stone-500">Tổng thanh toán</span>
                    <div className="flex items-center gap-2.5">
                      {(order.status === 'PAYMENT_FAILED' || order.status === 'PENDING') && (
                        <Link
                          href={`/checkout?orderCode=${encodeURIComponent(order.orderCode)}&amount=${(order.totalAmount ?? order.total) || 0}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 rounded-lg transition shadow-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Thanh toán lại
                        </Link>
                      )}
                      <span className="font-bold text-base text-amber-900">
                        {((order.totalAmount ?? order.total) || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
