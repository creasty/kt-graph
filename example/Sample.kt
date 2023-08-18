package jp.henryapp.sample

import jp.henryapp.other.Imported1

typealias Alias1 = Imported1

class Sample(
    val sampleId: SampleId,
    val imported1: Imported1,
) {
    class Foo1(val id: FooId, val enum: Enum1) {
        class Bar1(val id: BarId, val foo1: Foo1)
        class Bar2(val id: BarId, val bar1: Bar1)

        companion object Companion1 {
        }
    }

    companion object {
      enum class Enum1 {
          A, B, C
      }
    }
}

sealed interface DateRange {
    fun toClosedOrThrow(): Closed

    interface Closed : DateRange {
        fun foo(): Closed?
    }

    data class From(val v: Boolean) : DateRange
    data class Fixed(val v: Boolean) : Closed
}

class OrderSessionInvoiceEditorDataUseCase {
    companion object {
        sealed interface CostSyncState {
        }

        object NotYet : CostSyncState {
        }
    }
    fun getOrderCostSyncState(): CostSyncState {
        return NotYet
    }
}
