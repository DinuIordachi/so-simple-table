export interface IColumnFilterOption {
	readonly text: string;
	readonly value: string;
}

export interface IColumn {
	readonly name: string;
	readonly key: string;
	readonly width?: number;
	readonly render?: boolean;
	readonly sortable?: boolean;
	readonly columnTooltip?: string;
	readonly showCellTooltip?: boolean;
	readonly filters?: readonly IColumnFilterOption[];
	readonly filterMultiple?: boolean;
	readonly cutString?: boolean;
	readonly search?: {
		readonly placeholder: string;
		readonly pattern?: RegExp;
		readonly errorMessage?: string;
	};
}
