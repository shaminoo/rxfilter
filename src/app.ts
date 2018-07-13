class myController {
    public test = "test";
}
class myService {
    public testVar;
    constructor($timeout: ng.ITimeoutService) {
        this.testVar = 1;
        $timeout(() => {
            this.testVar = 2;
        }, 2000);
    }
}

let app = angular.module('myApp', []);
app.controller('myctrl', myController);
app.service('myService', myService);

class filterQSService {
    public dependentSvcVar = new Rx.Subject();
    public isPlay = true;
    private subscription;
    
    constructor(public $q: ng.IQService, public $timeout: ng.ITimeoutService) {
        this.myPromise().then((data) => {
            this.subscription = Rx.Observable.timer(0, 10000)
            .switchMap(() => {             
                return Rx.Observable.of(data);
            })
            .subscribe((value) => {
                if(this.isPlay)
                    this.dependentSvcVar.next(value);
            })
        }).catch((error) => {
            this.dependentSvcVar.next({"error": error});
        });
    }
    
    public myPromise(): ng.IPromise<any> {
        let promise = this.$q.defer();
        this.$timeout(() => {
             promise.resolve("filter");
            //promise.reject('error');
        }, 2000);
        return promise.promise;
    }

    public updateFeed(filter) {
        if(this.subscription)
            this.subscription.unsubscribe();
        this.subscription = Rx.Observable.timer(0, 10000).switchMap(() => { 
            return Rx.Observable.of(filter) 
        })
        .subscribe((value) => {
            if(this.isPlay)
                this.dependentSvcVar.next(value);
        })
    }

    
}

app.service('filterQSService', filterQSService);

interface Map<T> {
    [key: string]: T;
}

class realTimeQSService {
    private subjectMap: Array<Map<Rx.Subject<any>>> = [];
    private refreshLoopset = false;
    private filterObs: Rx.Observable<any>;
    constructor(public $interval: ng.IIntervalService, public $timeout: ng.ITimeoutService, public filterQSService: filterQSService, public $q: ng.IQService) {
        this.filterObs = Rx.Observable.from(this.filterQSService.dependentSvcVar);
    }
    public addFeed(query: string): Rx.Observable<any> {
        let subject = new Rx.Subject();
        
        return this.filterObs.switchMap((filter) => {
            if (filter.error) {
                return Rx.Observable.of({error: filter.error});
            }
            return this.getDataPromise(filter, query).then((data) => {
                console.log(data);
                return data;
            }).catch((error) => {
                return Rx.Observable.of({"error": error});
            })
        });
    }

    private getDataPromise(filter, query): ng.IPromise<any> {
        let promise = this.$q.defer();
        this.$timeout(() => {
            promise.resolve(filter + query);
            //promise.reject('error');
        }, 2000);
        return promise.promise;
    }
}
app.service("realTimeQSService", realTimeQSService);

class mainCtrl {
    public showSecond = false;

    public showSecondFn() {
        this.showSecond = true;
    }

    public removeSecondFn() {
        this.showSecond = false;
    }
}

app.controller("mainCtrl", mainCtrl);

class dependentController {
    public dependentCtrlVar;
    constructor(realTimeQSService: realTimeQSService) {
        let query = "query1";
        let subject = realTimeQSService.addFeed(query);
        this.dependentCtrlVar = "loading...";
        subject.subscribe((value) => {
            console.log('sub1'+value);
            if(!value.error) {
                this.dependentCtrlVar = value;
            }
        },
        (error) => { 
            console.log(error)
        },
        () => {
            console.log('completed');
        });
    }
}

app.controller('dependentController', dependentController);

class dependentController1 {
    public dependentCtrlVar;
    constructor(realTimeQSService: realTimeQSService, public $scope: ng.IScope) {
        let baseQuery = "query2";
        let sub2 = realTimeQSService.addFeed(baseQuery);
        this.dependentCtrlVar = "loading...";
        let sub = sub2.subscribe((value) => {
            console.log('sub2'+value);
            this.dependentCtrlVar = value;
        },
        (error) => { 
            console.log(error)
        },
        () => {
            console.log('completed');
        });

        $scope.$on("$destroy", () => {
            sub.unsubscribe();
        })
    }
    
}
app.controller('dependentController1', dependentController1);

class filterController {
    constructor(public filterQSService: filterQSService) {
        
    }

    public apply(filter) {
        this.filterQSService.updateFeed(filter);
    }

    public playPause() {
        this.filterQSService.isPlay = !this.filterQSService.isPlay;
    }
}

app.controller('filterController', filterController);

