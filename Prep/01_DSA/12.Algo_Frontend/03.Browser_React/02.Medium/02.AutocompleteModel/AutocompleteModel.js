/*
Autocomplete Model

Problem Statement:
Build the state logic for an accessible autocomplete. It filters options by query,
tracks an active option for ArrowUp/ArrowDown, and selects with Enter.

Solution:
Keep query, filtered options, and active index as one consistent model. Filtering
resets the active option; navigation wraps only when there are suggestions.

Complexity: O(n) per query for n options | O(n) filtered-result space
*/

class AutocompleteModel {
    constructor(options) {
        this.options = options;
        this.query = '';
        this.matches = options;
        this.activeIndex = -1;
    }

    setQuery(query) {
        this.query = query;
        const normalized = query.trim().toLowerCase();
        this.matches = this.options.filter((option) => option.toLowerCase().includes(normalized));
        this.activeIndex = this.matches.length > 0 ? 0 : -1;
        return this.matches;
    }

    move(direction) {
        if (this.matches.length === 0) return null;
        this.activeIndex = (this.activeIndex + direction + this.matches.length) % this.matches.length;
        return this.matches[this.activeIndex];
    }

    selectActive() {
        return this.activeIndex === -1 ? null : this.matches[this.activeIndex];
    }
}

function runTests() {
    const model = new AutocompleteModel(['Apple', 'Apricot', 'Banana']);
    const matches = model.setQuery('ap');
    const passed = JSON.stringify(matches) === JSON.stringify(['Apple', 'Apricot'])
        && model.selectActive() === 'Apple' && model.move(1) === 'Apricot' && model.move(1) === 'Apple';
    console.log(`Overall Result: ${passed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
}

runTests();

module.exports = { AutocompleteModel };
