import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, Injectable } from '@angular/core';
import { By } from '@angular/platform-browser';
import type { IColumn, IResponse, IResponseList } from '@sst/core';
import { ListRepository } from '@sst/core';
import { SstTableService } from '../store/sst-table.service';
import { SstTableComponent } from './sst-table.component';

interface IItem {
	id: string;
	name: string;
	status: 'active' | 'paused';
}

@Injectable()
class StubRepository extends ListRepository<IItem> {
	public override getList = jest.fn().mockResolvedValue({
		result: [
			{ id: '1', name: 'alpha', status: 'active' },
			{ id: '2', name: 'beta', status: 'paused' },
		],
		totalCount: 2,
		isSuccess: true,
	} satisfies IResponseList<IItem[]>);
	public override bulkDelete = jest
		.fn()
		.mockResolvedValue({ result: 'ok', isSuccess: true } satisfies IResponse<string>);
}

@Injectable()
class TestTableService extends SstTableService<IItem> {
	public constructor(repository: StubRepository) {
		super({ repository, sortMap: { name: 'ByName' } });
	}
}

@Component({
	standalone: true,
	imports: [SstTableComponent],
	template: `
		<sst-table [columns]="columns" [service]="service" [bulk]="true" [searchEnabled]="true">
			<ng-template #headerCell let-column>
				<strong>{{ column.name }}</strong>
			</ng-template>
			<ng-template #bodyCell let-row let-column="column">
				<span data-test-cell>{{ row[column.key] }}</span>
			</ng-template>
		</sst-table>
	`,
})
class HostComponent {
	public readonly columns: IColumn[] = [
		{ key: 'name', name: 'Name', sortable: true },
		{ key: 'status', name: 'Status' },
	];
	public readonly service: TestTableService;
	public constructor(service: TestTableService) {
		this.service = service;
	}
}

describe('SstTableComponent', () => {
	let fixture: ComponentFixture<HostComponent>;

	beforeEach(async () => {
		TestBed.configureTestingModule({
			providers: [StubRepository, TestTableService],
			imports: [HostComponent],
		});
		fixture = TestBed.createComponent(HostComponent);
		fixture.detectChanges();
		// Wait for the auto-refresh microtask + the resolved repository promise.
		await fixture.whenStable();
		fixture.detectChanges();
	});

	it('renders one row per data item using the bodyCell slot', () => {
		const cells = fixture.nativeElement.querySelectorAll('[data-test-cell]') as NodeListOf<HTMLElement>;
		expect(cells.length).toBe(4); // 2 rows × 2 columns
		expect(cells[0].textContent).toContain('alpha');
		expect(cells[1].textContent).toContain('active');
	});

	it('renders the empty state when no rows are present', async () => {
		fixture.componentInstance.service.updateData([]);
		fixture.componentInstance.service.updateTotal(0);
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('[data-test-empty]')).toBeTruthy();
	});

	it('renders a search input when searchEnabled is true', () => {
		expect(fixture.nativeElement.querySelector('input[data-test-search]')).toBeTruthy();
	});

	it('updates the service search value when typing', async () => {
		const input = fixture.nativeElement.querySelector('input[data-test-search]') as HTMLInputElement;
		input.value = 'alpha';
		input.dispatchEvent(new Event('input'));
		fixture.detectChanges();
		// Component debounces — wait for the timer.
		await new Promise((r) => setTimeout(r, 600));
		expect(fixture.componentInstance.service.search()).toBe('alpha');
	});

	it('shows a sort indicator only on sortable columns', () => {
		const headers = fixture.nativeElement.querySelectorAll('[data-test-th]') as NodeListOf<HTMLElement>;
		expect(headers[0].getAttribute('data-sortable')).toBe('true');
		expect(headers[1].getAttribute('data-sortable')).toBe('false');
	});

	it('toggles all checkboxes when the bulk header checkbox is clicked', () => {
		const headerCheckbox = fixture.nativeElement.querySelector('input[data-test-bulk-all]') as HTMLInputElement;
		headerCheckbox.click();
		fixture.detectChanges();
		const rowCheckboxes = fixture.nativeElement.querySelectorAll(
			'input[data-test-bulk-row]',
		) as NodeListOf<HTMLInputElement>;
		expect(Array.from(rowCheckboxes).every((c) => c.checked)).toBe(true);
	});

	it('coerces numeric row ids to strings for selection and bulk delete', async () => {
		// Reach the inner component to drive its (protected) selection API with a
		// numeric id — ids are tracked as strings, so a number must still match.
		const table = fixture.debugElement.query(By.directive(SstTableComponent)).componentInstance as unknown as {
			onRowChecked(id: number, checked: boolean): void;
			isRowSelected(id: string | number): boolean;
			onBulkDelete(): Promise<void>;
		};
		table.onRowChecked(7, true);
		expect(table.isRowSelected(7)).toBe(true); // numeric lookup
		expect(table.isRowSelected('7')).toBe(true); // string lookup hits the same key
		await table.onBulkDelete();
		expect(TestBed.inject(StubRepository).bulkDelete).toHaveBeenCalledWith(['7']);
	});
});
