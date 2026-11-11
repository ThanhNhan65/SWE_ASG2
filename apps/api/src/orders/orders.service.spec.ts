import { describe, it, expect, beforeEach } from 'vitest';
import { OrderStateMachine, OrderStatus } from './order-state-machine';
import { BadRequestException } from '@nestjs/common';

describe('OrderStateMachine (Unit Test)', () => {
  let stateMachine: OrderStateMachine;

  beforeEach(() => {
    stateMachine = new OrderStateMachine();
  });

  it('hợp lệ: cho phép chuyển trạng thái từ PENDING sang PAID khi thanh toán thành công', () => {
    expect(() => {
      stateMachine.assertTransition(OrderStatus.PENDING, OrderStatus.PAID);
    }).not.toThrow();
  });

  it('hợp lệ: cho phép chuyển trạng thái từ PAID sang PREPARING khi barista bắt đầu pha chế', () => {
    expect(() => {
      stateMachine.assertTransition(OrderStatus.PAID, OrderStatus.PREPARING);
    }).not.toThrow();
  });

  it('hợp lệ: cho phép chuyển trạng thái từ PREPARING sang READY khi hoàn tất món', () => {
    expect(() => {
      stateMachine.assertTransition(OrderStatus.PREPARING, OrderStatus.READY);
    }).not.toThrow();
  });

  it('hợp lệ: cho phép chuyển trạng thái từ READY sang COMPLETED khi khách nhận món', () => {
    expect(() => {
      stateMachine.assertTransition(OrderStatus.READY, OrderStatus.COMPLETED);
    }).not.toThrow();
  });

  it('chặn lỗi: không cho phép chuyển từ PENDING sang PREPARING khi chưa thanh toán', () => {
    expect(() => {
      stateMachine.assertTransition(OrderStatus.PENDING, OrderStatus.PREPARING);
    }).toThrow(BadRequestException);
  });

  it('chặn lỗi: không cho phép huỷ đơn (CANCELLED) khi đơn đã COMPLETED', () => {
    expect(() => {
      stateMachine.assertTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED);
    }).toThrow(BadRequestException);
  });
});
