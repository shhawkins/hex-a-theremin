export const isIPad = (): boolean => {
    return (
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
        navigator.platform === 'iPad' ||
        navigator.userAgent.includes('iPad')
    );
};
