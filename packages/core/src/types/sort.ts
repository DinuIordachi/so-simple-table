export enum ESortOrder {
	ASC = 'ASC',
	DESC = 'DESC',
}

export interface ISortParams {
	readonly id: string;
	readonly field: string;
	readonly order: ESortOrder;
}
