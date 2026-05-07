# @sst/ng

Angular adapter for **So Simple Table**, built on top of [`@sst/core`](../core/README.md).

## Installation

```bash
npm install @sst/core @sst/ng
```

Make sure `provideHttpClient()` is added to the application's bootstrap providers.

## 1. Define a repository

```ts
import { Injectable } from '@angular/core';
import { SstNgRepository } from '@sst/ng';

interface IStrategy { id: string; name: string; createdAt: string; }

@Injectable({ providedIn: 'root' })
export class StrategyRepository extends SstNgRepository<IStrategy> {
	protected override get baseUrl(): string {
		return 'https://api.example.com/strategies';
	}
}
```

## 2. Define a table service

```ts
import { Injectable, inject } from '@angular/core';
import { SstTableService } from '@sst/ng';
import { StrategyRepository } from './strategy.repository';

@Injectable()
export class StrategyTableService extends SstTableService<IStrategy> {
	public constructor() {
		super({
			repository: inject(StrategyRepository),
			sortMap: { createdAt: 'ByCreationDate', name: 'ByName' },
		});
	}
}
```

## 3. Use the component

```html
<sst-table
	[columns]="columns"
	[service]="service"
	[bulk]="true"
	[searchEnabled]="true"
>
	<ng-template #headerCell let-column>
		<strong>{{ column.name }}</strong>
	</ng-template>

	<ng-template #bodyCell let-row let-column="column">
		{{ row[column.key] }}
	</ng-template>

	<ng-template #emptyState>
		<p>No strategies yet — try creating one.</p>
	</ng-template>
</sst-table>
```

```ts
import { Component, inject } from '@angular/core';
import { SstTableComponent, type IColumn } from '@sst/ng';
import { StrategyTableService } from './strategy-table.service';

@Component({
	selector: 'app-strategies-page',
	standalone: true,
	imports: [SstTableComponent],
	providers: [StrategyTableService],
	templateUrl: './strategies-page.component.html',
})
export class StrategiesPageComponent {
	public readonly service = inject(StrategyTableService);
	public readonly columns: IColumn[] = [
		{ key: 'name', name: 'Name', sortable: true },
		{ key: 'createdAt', name: 'Created' },
	];
}
```

## Customizing the wire format

```ts
@Injectable({ providedIn: 'root' })
export class StrategyRepository extends SstNgRepository<IStrategy> {
	protected override get baseUrl() { return 'https://api.example.com/strategies'; }
	protected override get queryKeys() {
		return { page: 'pageNumber', pageSize: 'limit', orderBy: 'sortBy', orderByDescending: 'sortDesc' };
	}
	protected override get responseListMapper() {
		return (raw: unknown) => {
			const r = raw as { items: IStrategy[]; total: number };
			return { result: r.items, totalCount: r.total, isSuccess: true };
		};
	}
}
```

## Content slots

`<sst-table>` exposes four template slots for full UI override:

| Slot              | Context                                      | Purpose                          |
| ----------------- | -------------------------------------------- | -------------------------------- |
| `#headerCell`     | `{ $implicit: IColumn }`                     | Override per-column header text  |
| `#bodyCell`       | `{ $implicit: T; column: IColumn; index }`   | Override per-cell rendering      |
| `#emptyState`     | —                                            | Override the empty-state message |
| `#bulkActions`    | `{ $implicit: ReadonlySet<string> }`         | Override the bulk-action toolbar |

When omitted, sensible defaults render automatically.

## License

MIT
