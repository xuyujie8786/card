/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  return {
    // 保留原有的 canAdmin 权限（用于兼容）
    canAdmin: currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN'),
    
    // 超级管理员专属权限：账单审核、公告管理
    canSuperAdmin: currentUser && currentUser.role === 'SUPER_ADMIN',
    
    // 用户管理权限：超级管理员 + 管理员
    canManageUsers: currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN'),
  };
}
