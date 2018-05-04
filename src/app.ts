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
    public dependentSvcVar = new Rx.BehaviorSubject(1);
    constructor(public $q: ng.IQService, public $timeout: ng.ITimeoutService) {
        this.myPromise().then((data) => {
            this.dependentSvcVar.next(data);
        })
    }
    
    public myPromise(): ng.IPromise<any> {
        let promise = this.$q.defer();
        this.$timeout(() => {
            promise.resolve("filter");
        }, 2000);
        return promise.promise;
    }
}

app.service('filterQSService', filterQSService);

interface Map<T> {
    [key: string]: T;
}

class realTimeQSService {
    private subjectMap: Array<Map<Rx.Subject<any>>> = [];
    private refreshLoopset = false;
    constructor(public $interval: ng.IIntervalService, public $timeout: ng.ITimeoutService, filterQSService: filterQSService) {
    }
    public addFeed(query: string) {
        let subject = new Rx.Subject();
        let map = {};
        map[query] = subject;
        this.subjectMap.push(map);
        this.refreshFeed(subject, query);
        this.setRefreshLoop();
        return subject;
    }

    private setRefreshLoop() {
        if(!this.refreshLoopset) {
            this.refreshLoopset = true;
            this.$interval(()=> {
                this.subjectMap.forEach(element => {
                    let query = Object.keys(element)[0];
                    let subject = element[query];
                    subject.next(2 + query);
                })
            }, 5000);
        }
    }

    private refreshFeed(subject: Rx.Subject<any>, query) {
        this.$timeout(() => {
            subject.next(1 + query);
        }, 2000);
    }
}
app.service("realTimeQSService", realTimeQSService);

class dependentController {
    public dependentCtrlVar;
    constructor(filterQSService: filterQSService, $timeout: ng.ITimeoutService, realTimeQSService: realTimeQSService) {
        // filterQSService.dependentSvcVar.subscribe((value) => {
        //     this.dependentCtrlVar = value;
        // });
        let query = "query1";
        let subject = realTimeQSService.addFeed(query);
        subject.subscribe((value) => {
            this.dependentCtrlVar = value;
        },
        (error) => { 
            console.log(error)
        },
        () => {
            console.log('completed');
        });
    }

    updateValue() {
        this.dependentCtrlVar = 2;
    }
}

app.controller('dependentController', dependentController);

class dependentController1 {
    public dependentCtrlVar;
    constructor(filterQSService: filterQSService, $timeout: ng.ITimeoutService, realTimeQSService: realTimeQSService) {
        // filterQSService.dependentSvcVar.subscribe((value) => {
        //     this.dependentCtrlVar = value;
        // });
        let baseQuery = "query2";
        let sub2 = realTimeQSService.addFeed(baseQuery);
        sub2.subscribe((value) => {
            this.dependentCtrlVar = value;
        },
        (error) => { 
            console.log(error)
        },
        () => {
            console.log('completed');
        });
    }
}

app.controller('dependentController1', dependentController1);