export interface Claim {
	typ: string;
	val: string;
}

export interface ClientPrincipal {
	identityProvider: string;
	userId: string;
	userDetails: string;
	userRoles: string[];
	claims: Claim[];
}

export type DefaultUser = ClientPrincipal;

export interface Config {
	backend: string;
	port: number;
	host: string;
	open: boolean;
	devserverTimeout: number;
	cookieName: string;
	defaultUser?: DefaultUser;
}
