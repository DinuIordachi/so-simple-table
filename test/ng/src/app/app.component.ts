import { Component, inject } from '@angular/core';
import { SstTableComponent, type IColumn } from '@sst/ng';
import { BreedTableService } from './breed-table.service';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [SstTableComponent],
	providers: [BreedTableService],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss',
})
export class AppComponent {
	public readonly service = inject(BreedTableService);
	public readonly columns: IColumn[] = [
		{ key: 'name', name: 'Breed' },
		{ key: 'description', name: 'Description' },
		{ key: 'hypoallergenic', name: 'Hypoallergenic' },
		{ key: 'life', name: 'Lifespan' },
	];
}
