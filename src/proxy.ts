import { NextResponse, type NextRequest } from 'next/server';

const env = process.env.NODE_ENV || 'development';

const applyCsp = (requestHeaders: Headers, response: NextResponse): void => {
	const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
	const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;
	const contentSecurityPolicyHeaderValue = cspHeader
		.replace(/\s{2,}/g, ' ')
		.trim();

	requestHeaders.set('x-nonce', nonce);
	requestHeaders.set(
		'Content-Security-Policy',
		contentSecurityPolicyHeaderValue,
	);
	response.headers.set(
		'Content-Security-Policy',
		contentSecurityPolicyHeaderValue,
	);
};

export async function proxy(request: NextRequest) {
	const requestHeaders = new Headers(request.headers);

	const response = await NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	});

	if (env !== 'development') {
		applyCsp(requestHeaders, response);
	}

	return response;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * Feel free to modify this pattern to include more paths.
		 */
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
};
