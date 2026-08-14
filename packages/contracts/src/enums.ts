import { z } from 'zod';

export const ORDER_STATUS = {
  ALLOCATED: 'ALLOCATED',
  HANDED_OVER: 'HANDED_OVER',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const orderStatusSchema = z.enum([
  ORDER_STATUS.ALLOCATED,
  ORDER_STATUS.HANDED_OVER,
  ORDER_STATUS.CANCELLED,
]);

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  ALLOCATED: '引当済',
  HANDED_OVER: '引き渡し済',
  CANCELLED: 'キャンセル',
};

export const USER_ROLE = {
  OPERATOR: 'OPERATOR',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const userRoleSchema = z.enum([USER_ROLE.OPERATOR, USER_ROLE.ADMIN]);

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  OPERATOR: '担当者',
  ADMIN: '管理者',
};
